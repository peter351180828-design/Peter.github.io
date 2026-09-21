import type {
  StudioTemplate,
} from '../types/studio'

export const templates: StudioTemplate[] = [
  {
    id: '01',
    name: '经典元数据',
    category: '元数据 / 白色',
    description:
      '以相机元数据为核心的简洁摄影画框。',
    frameDefault: 18,
    backgroundDefault: 'white',
  },
  {
    id: '02',
    name: '35mm 胶片',
    category: '35mm / 胶片',
    description:
      '35mm 胶片风格模板，包含齿孔、帧号、边缘标记与克制的信息排版。',
    frameDefault: 18,
    backgroundDefault: 'warm',
  },
  {
    id: '03',
    name: '色彩取样',
    category: '色彩 / 取样',
    description:
      '从图片中提取代表色，以色点和简洁编辑式底栏呈现。',
    frameDefault: 18,
    backgroundDefault: 'white',
  },
  {
    id: '04',
    name: '磨砂信息条',
    category: '叠层 / 电影感',
    description:
      '以图片延展背景与半透明磨砂信息条构成的电影感画框。',
    frameDefault: 22,
    backgroundDefault: 'black',
  },
  {
    id: 'I01',
    name: '插画画廊',
    category: '插画 / 画廊',
    description:
      '适合插画、动漫、CG 与无 EXIF 图片的安静画廊展签版式。',
    frameDefault: 20,
    backgroundDefault: 'warm',
  },
  {
    id: 'I02',
    name: '插画海报',
    category: '插画 / 海报',
    description:
      '满版海报布局，使用大标题层级、版本文字与图形化边缘标记。',
    frameDefault: 10,
    backgroundDefault: 'black',
  },
  {
    id: 'I03',
    name: '漫画分镜',
    category: '插画 / 分镜',
    description:
      '将同一张插画拆分为主画面与两组局部特写，形成具有叙事感的漫画分镜版式。',
    frameDefault: 16,
    backgroundDefault: 'warm',
  },
]
