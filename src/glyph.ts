// Adapted from OCS 84be4cbf09181d697b15d83d8f0b8a7a2f11a788 (MIT, Copyright 2022 enncy). See lib/OCS-LICENSE.txt.
var RunaGlyph:(base64:string,chars:string,url:string)=>Promise<Record<number,string>>=globalThis.RunaGlyph||(()=>{
/**
 * 字体解密框架 - 类型定义
 *
 * 背景：部分网课平台使用"字形置换"加密——页面下发的字体中，
 * 码点 X 的字形轮廓实际画的是另一个字 Y。浏览器渲染正常，
 * 但直接读取 HTML 文本得到的是乱码（通常是生僻字/繁体字）。
 *
 * 本框架通过"位图特征匹配"解密：把密文字符用加密字体渲染成位图，
 * 与预计算的参考特征表（由官方原版字体生成）做最近邻匹配，
 * 找出每个密文字形"实际画的是哪个字"。
 */

/** 参考特征表（FRB2 格式，位打包二值特征） */
interface RefTable {
	/** 候选字数量 */
	count: number;
	/** 候选字码点表（长度 = count） */
	cps: Uint32Array;
	/** 粗特征（二值 0/1，长度 = count × gc × gc），用于快速粗筛 */
	coarse: Uint8Array;
	/** 精特征（二值 0/1，长度 = count × gf × gf），用于精确排序 */
	fine: Uint8Array;
	/** 粗特征网格边长 */
	gc: number;
	/** 精特征网格边长 */
	gf: number;
	/** 查询端二值化阈值（与生成端一致，写在表头中） */
	threshold: number;
}

/** 平台解密配置 */
interface FontDecryptConfig {
	/**
	 * 参考特征表 URL（FRB2 格式）。
	 * 不同平台的加密字体可能基于不同字重设计，需使用对应字重生成的表：
	 * - 超星 font-cxsecret：Source Han Sans Normal(wght350) 设计 -> 用 350/400 字重表
	 * - 考试平台可变字体：Source Han Sans SC VF 默认实例(wght250) -> 用 250 字重表
	 */
	refTableUrl: string;
	/**
	 * FontFace 加载字体时的 weight 描述符。
	 *
	 * 【可变字体必须设置】浏览器默认按 font-weight:400 实例化可变字体，
	 * 若特征表按其他字重（如 250）生成，笔画粗细不一致会导致匹配失败。
	 * 静态字体（如超星 cxsecret）只有一个字重，此设置无实际影响，可省略。
	 */
	fontWeight?: string;
	/** 破解进度回调（可用于在页面上显示进度） */
	onProgress?: (done: number, total: number) => void;
	/**
	 * 是否在 Web Worker 中执行破解（默认 true）。
	 * Worker 内使用 OffscreenCanvas 渲染，不阻塞主线程；
	 * 若环境不支持（无 OffscreenCanvas、CSP 拦截 worker-src 等）自动回退主线程。
	 */
	useWorker?: boolean;
}

/** 单个字符的匹配详情 */
interface CrackDetail {
	/** 密文字（HTML 中的乱码字符） */
	from: string;
	/** 真实字（肉眼看到的字符） */
	to: string;
	/**
	 * 匹配置信度 = 1 - 最优距离/次优距离。
	 * 越接近 1 区分度越高；低于 0.3 时建议人工复核（多为形近字）。
	 */
	margin: number;
}

/** 破解结果 */
interface CrackResult {
	/** 密文字 -> 真实字 的映射表 */
	map: Record<string, string>;
	/** 每个字符的匹配详情 */
	details: CrackDetail[];
}


/**
 * 参考特征表加载器（FRB2 格式）
 *
 * FRB2 二进制格式（小端序）：
 * ┌────────────────────────────────────────────────────────┐
 * │ magic      "FRB2"        4B   格式标识                  │
 * │ count      uint32        4B   候选字数量                │
 * │ threshold  uint32        4B   查询端二值化阈值           │
 * │ gc         uint32        4B   粗特征网格边长（如 16）     │
 * │ gf         uint32        4B   精特征网格边长（如 24）     │
 * │ codepoints uint32×count       候选字码点表               │
 * │ coarse     位打包 count×gc²/8B  粗特征（MSB 优先）        │
 * │ fine       位打包 count×gf²/8B  精特征（MSB 优先）        │
 * └────────────────────────────────────────────────────────┘
 *
 * 表由离线脚本（.codebuddy/font_analysis/）用官方原版字体生成：
 * 把每个候选字渲染成位图 -> 盒式平均降采样 -> 按阈值二值化 -> 位打包。
 * 位打包后每字仅占 (gc²+gf²)/8 字节，单平台全量表约 0.76MB（gzip 后约 0.3MB）。
 *
 * 特征表与平台加密方式无关（只取决于官方字体设计），一次生成永久有效，
 * 不需要像哈希表那样随平台改字体而更新。
 */

/** 按 URL 缓存加载结果（特征表可跨页面/跨字体复用，只加载一次） */
const refTableCache = new Map<string, Promise<RefTable>>();

/** 把位打包数据解包为 0/1 数组（便于直接做 L2 距离计算） */
function unpackBits(packed: Uint8Array, offset: number, count: number, dims: number): Uint8Array {
	const bytesPerGlyph = dims / 8;
	const out = new Uint8Array(count * dims);
	for (let i = 0; i < count; i++) {
		const pBase = offset + i * bytesPerGlyph;
		const oBase = i * dims;
		for (let b = 0; b < bytesPerGlyph; b++) {
			const byte = packed[pBase + b];
			// MSB 优先：第 0 位是字节的最高位
			for (let k = 0; k < 8; k++) {
				out[oBase + b * 8 + k] = (byte >> (7 - k)) & 1;
			}
		}
	}
	return out;
}

/** 加载参考特征表（同一 URL 只加载一次；失败后清除缓存允许下次重试） */
function loadRefTable(url: string): Promise<RefTable> {
	let cached = refTableCache.get(url);
	if (!cached) {
		// fetch 无响应时可能永不 settle，加超时防止无限等待
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 30_000);
		cached = fetch(url, { signal: controller.signal })
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				const dv = new DataView(buf);
				const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
				if (magic !== 'FRB2') {
					throw new Error('[font-decrypt] 无效的特征表格式: ' + magic);
				}
				const count = dv.getUint32(4, true);
				const threshold = dv.getUint32(8, true);
				const gc = dv.getUint32(12, true);
				const gf = dv.getUint32(16, true);
				const cps = new Uint32Array(count);
				let off = 20;
				for (let i = 0; i < count; i++, off += 4) {
					cps[i] = dv.getUint32(off, true);
				}
				const packed = new Uint8Array(buf);
				const coarse = unpackBits(packed, off, count, gc * gc);
				off += (count * gc * gc) / 8;
				const fine = unpackBits(packed, off, count, gf * gf);
				return { count, cps, coarse, fine, gc, gf, threshold };
			});
		// 无论成功失败都清除超时定时器；失败时清除缓存，
		// 避免缓存住 rejected Promise 导致后续永远失败（网络恢复后也无法重试）
		cached = cached
			.then((table) => {
				clearTimeout(timer);
				return table;
			})
			.catch((err) => {
				clearTimeout(timer);
				refTableCache.delete(url);
				throw err;
			});
		refTableCache.set(url, cached);
	}
	return cached;
}


/**
 * 位图渲染匹配核心算法
 *
 * 【整体流程】
 *   密文字 -> 用加密字体渲染到 canvas -> 提取二值位图特征
 *   -> 在参考特征表中做两级最近邻搜索 -> 得到"该字形实际画的是哪个字"
 *
 * 【归一化方案（两端必须与特征表生成脚本严格一致）】
 * 字形渲染的坐标系直接决定特征可比性，这里采用"固定坐标系"：
 *   - 480×480 固定画布、字号 360、基线固定 y=384、按 advance 水平居中
 *   - 不使用字体自身度量（ascent/descent）定位——加密字体的 hhea 表
 *     常被生成工具改写，与官方字体不一致，而轮廓相对基线原点的位置
 *     是字体设计的固有属性，两端一致
 *   - 保留绝对位置信息：不裁剪墨迹 bbox，因此 一/—/_、丶/、 等
 *     仅靠位置区分的字符也能正确识别
 *
 * 【特征提取】
 *   盒式平均降采样（每个网格取平均灰度）后按阈值二值化为 0/1：
 *   - 盒式平均在 Python（离线生成端）和浏览器端可做到逐位一致，
 *     避免双线性等滤波算法的跨端差异
 *   - 二值特征对光栅化器的 gamma/抗锯齿差异天然鲁棒
 *     （笔画核心像素在任何光栅化器下都稳定为实心）
 *   - 480 与 16/24 均为整数倍关系，保证盒式平均无插值误差
 *
 * 【两级最近邻匹配】
 *   1. 粗筛：16×16 粗特征与全表（约 7000 字）计算 L2 距离，取最近 40 个候选
 *   2. 精排：24×24 精特征在候选中取最优
 *   置信度 margin = 1 - 最优距离/次优距离，越接近 1 越可靠
 *
 * 【可变字体字重陷阱（重要）】
 * 考试平台加密字体是 SourceHanSansSC-VF（wght 250-900），浏览器默认
 * 按 font-weight:400 实例化可变字体，而特征表按 wght250 生成，笔画粗细
 * 不一致会严重干扰匹配。canvas 不支持 font-variation-settings，
 * 解决办法是 FontFace 描述符声明 { weight: '250' } 锁定实例化字重。
 */

/** 渲染参数：与离线特征表生成脚本严格一致，修改需同步重新生成特征表 */
const RENDER = 360;
const SQ = 480;
const BASELINE = 384;
/** 粗筛候选数量 */
const SHORTLIST = 40;
/** 墨迹判定阈值（判断字形是否空白） */
const INK_THRESHOLD = 40;

/** 渲染画布单例（模块级复用，避免每字创建 canvas 的开销） */
let renderCanvas: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined;

function getRenderCanvas() {
	if (!renderCanvas) {
		const cv = document.createElement('canvas');
		cv.width = SQ;
		cv.height = SQ;
		renderCanvas = { cv, ctx: cv.getContext('2d', { willReadFrequently: true })! };
	}
	return renderCanvas;
}

/**
 * 渲染单字并提取特征。
 * 返回 { coarse, fine }（二值 0/1 数组）；空白字形（无墨迹）返回 null。
 */
function renderGlyph(fontFamily: string, ch: string, table: RefTable): { coarse: Uint8Array; fine: Uint8Array } | null {
	const { ctx } = getRenderCanvas();
	ctx.clearRect(0, 0, SQ, SQ);
	ctx.fillStyle = '#fff';
	ctx.font = `${RENDER}px "${fontFamily}"`;
	ctx.textBaseline = 'alphabetic';
	const advance = ctx.measureText(ch).width;
	// 基线原点固定、按 advance 居中，保证同一设计的字形两端落位一致
	ctx.fillText(ch, (SQ - advance) / 2, BASELINE);
	const px = ctx.getImageData(0, 0, SQ, SQ).data;

	// 空白字形检测（空格等）：无任何墨迹则不参与匹配，按原样保留
	let hasInk = false;
	for (let i = 3; i < px.length; i += 4) {
		if (px[i] > INK_THRESHOLD) {
			hasInk = true;
			break;
		}
	}
	if (!hasInk) {
		return null;
	}

	// 积分图（summed-area table）：一次构建后每个网格 O(1) 求和，
	// 与逐像素盒式平均结果完全一致（SQ 与 16/24 均为整数倍关系，无插值）
	const W = SQ + 1;
	const ii = new Uint32Array(W * W);
	for (let y = 0; y < SQ; y++) {
		let rowSum = 0;
		const srcRow = y * SQ * 4;
		const dstRow = (y + 1) * W;
		const upRow = y * W;
		for (let x = 0; x < SQ; x++) {
			rowSum += px[srcRow + x * 4 + 3];
			ii[dstRow + x + 1] = ii[upRow + x + 1] + rowSum;
		}
	}

	// 盒式平均降采样（SQ 与目标网格为整数倍关系）+ 阈值二值化
	const box = (n: number) => {
		const b = SQ / n;
		const area = b * b;
		const out = new Uint8Array(n * n);
		for (let gy = 0; gy < n; gy++) {
			for (let gx = 0; gx < n; gx++) {
				const y0 = gy * b;
				const x0 = gx * b;
				const sum = ii[(y0 + b) * W + x0 + b] - ii[y0 * W + x0 + b] - ii[(y0 + b) * W + x0] + ii[y0 * W + x0];
				out[gy * n + gx] = sum / area > table.threshold ? 1 : 0;
			}
		}
		return out;
	};

	return { coarse: box(table.gc), fine: box(table.gf) };
}

/** 覆盖检测画布缓存（按 字体族+回退族 复用，避免反复创建 canvas） */
const coverageCanvasCache: Record<string, HTMLCanvasElement> = {};

/**
 * 双回退对比法检测字体是否覆盖某字符。
 *
 * 原理：
 *   - 字符在字体中："family", serif 与 "family", sans-serif 都使用
 *     该字体自身的字形渲染，两者像素完全相同
 *   - 字符不在字体中：分别走 serif / sans-serif 系统回退字体渲染，
 *     两种设计不同，像素必然有显著差异
 *
 * 用小号画布（200×200 @ 120px）快速判定，与主破解流程的大画布渲染互不影响。
 */
function isCoveredByFont(fontFamily: string, ch: string): boolean {
	const render = (fallback: string) => {
		const key = fontFamily + '|' + fallback;
		const cv =
			coverageCanvasCache[key] ??
			(coverageCanvasCache[key] = (() => {
				const c = document.createElement('canvas');
				c.width = 200;
				c.height = 200;
				return c;
			})());
		const ctx = cv.getContext('2d', { willReadFrequently: true })!;
		ctx.clearRect(0, 0, 200, 200);
		ctx.fillStyle = '#fff';
		ctx.font = `120px "${fontFamily}", ${fallback}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(ch, 10, 100);
		return ctx.getImageData(0, 0, 200, 200).data;
	};
	const a = render('serif');
	const b = render('sans-serif');
	let diff = 0;
	for (let i = 3; i < a.length; i += 4) {
		diff += Math.abs(a[i] - b[i]);
	}
	// 实测：覆盖字符 diff = 0，未覆盖字符 diff > 100000，阈值取 1000 足够安全
	return diff < 1000;
}

/** 两个二值特征向量的 L2 距离（等价于不同位的个数） */
function bitDistance(tableArr: Uint8Array, idx: number, dims: number, q: Uint8Array) {
	let s = 0;
	const base = idx * dims;
	for (let i = 0; i < dims; i++) {
		if (tableArr[base + i] !== q[i]) {
			s++;
		}
	}
	return s;
}

/** 单字符的两级最近邻匹配 */
function crackChar(table: RefTable, feat: { coarse: Uint8Array; fine: Uint8Array }) {
	const { count, cps, coarse, fine, gc, gf } = table;
	// 第一级：粗特征全表扫描
	const dists = new Float64Array(count);
	for (let i = 0; i < count; i++) {
		dists[i] = bitDistance(coarse, i, gc * gc, feat.coarse);
	}
	// 取第 SHORTLIST 小的距离作为阈值（原生排序远快于比较器索引排序），
	// 再单遍收集所有不超过阈值的候选（并列也收集，数量会略多于 SHORTLIST，不影响正确性）
	const sorted = Float64Array.from(dists);
	sorted.sort();
	const threshold = sorted[Math.min(SHORTLIST, count) - 1];
	const idx: number[] = [];
	for (let i = 0; i < count; i++) {
		if (dists[i] <= threshold) {
			idx.push(i);
		}
	}
	// 第二级：精特征在候选中取最优/次优
	let bestI = -1;
	let best = Infinity;
	let second = Infinity;
	for (let k = 0; k < idx.length; k++) {
		const i = idx[k];
		const d = bitDistance(fine, i, gf * gf, feat.fine);
		if (d < best) {
			second = best;
			best = d;
			bestI = i;
		} else if (d < second) {
			second = d;
		}
	}
	return {
		ch: String.fromCodePoint(cps[bestI]),
		best,
		second,
		margin: second > 0 ? 1 - best / second : 1
	};
}

/**
 * 破解加密字体，返回 密文字 -> 真实字 映射。
 *
 * @param fontSource 字体来源：URL 或 ArrayBuffer（FontFace 原生支持 ttf/otf/woff/woff2）
 * @param chars      需要破解的字符集合（通常取加密区域的全部文本去重即可，
 *                   无需破解整个字表；未提供的字符在解密时按原样保留）
 * @param config     平台解密配置（特征表地址、字重锁定等）
 */
async function crackFont(
	fontSource: string | ArrayBuffer,
	chars: string | string[],
	config: FontDecryptConfig
): Promise<CrackResult> {
	const table = await loadRefTable(config.refTableUrl);
	const uniq = [...new Set(chars)].filter((c) => c.trim() !== '');

	// 优先在 Web Worker 中破解（OffscreenCanvas 渲染，不阻塞主线程）；
	// 环境不支持或 Worker 失败时自动回退下方的主线程路径
	const family = 'font-decrypt-' + Math.random().toString(36).slice(2);
	const source = typeof fontSource === 'string' ? `url("${fontSource}")` : fontSource;
	// 可变字体必须通过 weight 描述符锁定实例化字重（见文件头注释）
	const face = new FontFace(family, source, config.fontWeight ? { weight: config.fontWeight } : {});
	// 字体 URL 无响应时 load() 可能永不 settle，必须加超时防止无限等待
	await Promise.race([
		face.load(),
		new Promise<never>((resolve, reject) => setTimeout(() => reject(new Error('[font-decrypt] 字体加载超时')), 15_000))
	]);
	// 项目 tsconfig 的 DOM lib 版本较旧，缺少 FontFaceSet.add 的类型定义，这里做最小断言
	(document.fonts as unknown as { add(font: FontFace): void }).add(face);

	const map: Record<string, string> = {};
	const details: CrackResult['details'] = [];
	for (let i = 0; i < uniq.length; i++) {
		const ch = uniq[i];
		// 【字体覆盖检测】加密字体只包含少量字形（如超星子集仅 60 个），
		// 页面明文区域的字符不在字体 cmap 内，浏览器会用系统回退字体渲染
		// （显示的就是真实字符），这类字符不是密文，必须跳过——
		// 否则回退渲染的图像参与匹配会产生垃圾映射。
		// 注意：document.fonts.check() 在 Chrome 中不检测字形覆盖（只检查
		// 字体是否加载完成），因此这里使用"双回退对比法"（见 isCoveredByFont）。
		if (!isCoveredByFont(family, ch)) {
			map[ch] = ch;
			continue;
		}
		const feat = renderGlyph(family, ch, table);
		if (!feat) {
			map[ch] = ch;
			continue;
		}
		const r = crackChar(table, feat);
		if (r.margin >= 0.3 && r.best <= table.gf * table.gf * 0.2) map[ch] = r.ch;
		details.push({ from: ch, to: r.ch, margin: +r.margin.toFixed(3) });
		config.onProgress?.(i + 1, uniq.length);
		// 让出主线程，避免长时间阻塞页面交互
		if (i % 10 === 9) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
	}
	(document.fonts as unknown as {delete(face:FontFace):void}).delete(face);
	return { map, details };
}


  const cache=new Map<string,Record<number,string>>();
  return async(base64:string,chars:string,url:string):Promise<Record<number,string>>=>{
    if(base64.length>4000000||chars.length>6000)throw new Error('字体数据过大');
    const map=cache.get(base64)||{},missing=[...new Set(chars)].filter(ch=>ch.charCodeAt(0)>=19968&&ch.charCodeAt(0)<40870&&!map[ch.charCodeAt(0)]);
    if(!missing.length)return map;
    const binary=atob(base64),bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
    const result=await crackFont(bytes.buffer,missing,{refTableUrl:url,fontWeight:'400',useWorker:false});
    for(const [from,to] of Object.entries(result.map))map[from.charCodeAt(0)]=to;
    if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(base64,map);return map;
  };
})();
