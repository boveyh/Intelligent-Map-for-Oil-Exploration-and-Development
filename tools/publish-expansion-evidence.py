"""Copy verified receipts and format screenshots; no synthetic test results are created."""
import json,hashlib,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
out=root/'docs/evidence/expansion';out.mkdir(parents=True,exist_ok=True)
sources={'models':'shots/expansion/model-checks.json','browser':'shots/expansion/browser-checks.json','original':'shots/review-2026-11-03/original-import-checks.json','presentation':'shots/expansion/presentation-checks.json'}
data={k:json.loads((root/v).read_text(encoding='utf-8')) for k,v in sources.items()}
assert len(data['models']['rows'])==13 and len(data['browser']['rows'])==78
assert data['original']['restoredAfterReload']==22 and not data['browser']['errors']
for k,v in sources.items():shutil.copy2(root/v,out/(k+'-checks.json'))
for p in (root/'shots/expansion').glob('*.png'):
 Image.open(p).convert('RGB').save(out/(p.stem+'.webp'),format='WEBP',quality=85,method=6)
shutil.copy2(root/'shots/expansion/contact.jpg',out/'concept-models.jpg')
files=['assets/core/case-upload.js','assets/core/case-demo-host.js','assets/core/registry.js','assets/cases/welllog-layer.case.js','assets/cases/welllog-layer.demo.js','firstbreak-pick-case/case.json','firstbreak-pick-case/demo/index.html','firstbreak-pick-case/demo/demo.js','firstbreak-pick-case/demo/demo.css']
original=Path.home()/'Downloads/石油勘探开发智能化案例集'
hashes={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}
assert all(hashes[f]==hashlib.sha256((original/f).read_bytes()).hexdigest() for f in files)
(out/'original-file-hashes.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
audit=json.loads((root/'docs/evidence/expansion-audit.json').read_text(encoding='utf-8'))
sizes=[p.stat().st_size+(p.parent/'demo/demo.js').stat().st_size for p in (root/'packages').glob('*/case.json')]
text=f'''# 十三例扩展验收 · 2026-11-03

当前22个自制案例＋1个原框架样例，共23个；原13模块每个新增一例，61个原场景保持，未恢复w6/w7。测井7个自制，其中五主例、一个标准化配套、一个跨井扩展。

## 已验证

|范围|证据|结论与限制|
|---|---|---|
|十三例模型|[模型检查](expansion/models-checks.json)|39个单点零扰动等于同路径预测；改输入改变中间量；改测试真值不改变推理；过去窗口与16次主动实验预算检查|
|三部分与小屏|[78项浏览器记录](expansion/browser-checks.json)|13例×背景/流程/演示×1280/375；无横溢出、坏图、挂载错误；键盘选点/试算/恢复、三步高亮、方法切换、实际回放与具名可访问滑杆|
|原站互导|[22包原站导入](expansion/original-checks.json)|未修改课程原站实际导入22包；18个实际单点面板可操作；刷新恢复22条。测试浏览器Chrome，不保证其他浏览器配额|
|原接口|[九文件哈希](expansion/original-file-hashes.json)|上传器、注册表、宿主、原案例及firstbreak文件与下载原版一致；sceneId仍来自原61场景|
|场景图|[23图映射及提示词](../../assets/models/README.md)|23张主图内容摘要互异；新增13张，共1,074,532字节。图片为概念图，演示推理另用真实数据SVG/canvas|
|条件审计|[报告](expansion-audit.md) / [JSON](expansion-audit.json)|117组设置×8个配对独立对象=936次；同一冻结模型，不按测试集调参；不是物理校准|
|首页/查看器|[呈现检查](expansion/presentation-checks.json)|13模块全部有入口；18个审计案例、179组设置；减少动态偏好暂停回放|

另外保留原五主例45项浏览器回归、单点契约、ZIP64/路径穿越/实际解压上限、原Hough/真实KNN/原首页生命周期检查。自动化键盘与AX树检查不等于真人屏幕阅读器测试；用户已选择不做真人教学测试，当前没有教学通过率或完成用时证据。

## 存储问题及修复

最初22包合计5,776,244字节，原站能逐个运行，但刷新只恢复20条；原存储会保存清单与文件文本，不能把包体总字节直接当作存储占用。保留原协议，将旧十张1536×1024图仅缩放、格式压至960×640：2,197,332→987,918字节。新十三张同尺寸，图片内容/构图不变。

当前22包合计{sum(sizes):,}字节，单包{min(sizes)/1024:.1f}—{max(sizes)/1024:.1f} KiB。实际原站重新导入22包，刷新恢复22条。没有增加浏览器权限、修改配额或改用私有接口；其他浏览器、本地已有大量数据仍可能达到各自存储上限。

试算滑杆另修复两点：先配置步长/范围再恢复试算值，防止浏览器初始范围调整把0挤到端点；质量例范围改为±0.24、步长0.02，保证0在合法刻度上。约束开度在1处向上试算会被夹回1，这是明确物理边界，验收改为向范围内部试算。模型数值与评价没有因此调优。

## 全部新增案例截图

|案例|背景|流程|演示 / 桌面 / 375px|
|---|---|---|---|
'''
for cid,c in audit['cases'].items():
 scene=cid.split('-')[0]
 text+=f"|{c['title']}|[入口](../../index.html#/scene/{scene}?case={cid}&tab=bg)|[入口](../../index.html#/scene/{scene}?case={cid}&tab=flow)|[入口](../../index.html#/scene/{scene}?case={cid}&tab=demo) · [1280px](expansion/{cid}-1280.webp) · [375px](expansion/{cid}-375.webp)|\n"
text+='''
截图取自实际操作后的场景区域；三部分的检查结果在78项记录中，不把一张图冒充完整操作证据。计划中的GR全曲线DTW、三维分割、CFD和部分固定方案对照未实现；具体差异已回填扩展计划。

## 仍需改进

外部审阅生成假设、接入许可明确的真实观测并冻结评价、复核原辅助例c1的迁移边界、真实屏幕阅读器与更多浏览器。全部数值为合成测试；重复满分和学习败给规则均公开。95分仍是目标，没有第三方评分或教学实证。

公网发布、资源哈希和首屏测量另见发布记录；上述本地检查不能自动证明公网版本已更新。
'''
(root/'docs/evidence/expansion-acceptance-2026-11-03.md').write_text(text,encoding='utf-8')
print('Published receipts and',len(list(out.glob('*.webp'))),'formatted screenshots; packages',sum(sizes))
