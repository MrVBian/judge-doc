import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid ({
  title: "测题机文档",
  description: "测题机文档",
  srcDir: "src",
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '文档', link: '/install' }
    ],

    sidebar: [
      {
        text: '文档',
        items: [
          { text: '安装', link: '/install' },
          { text: '设计', link: '/design' },
          { text: 'API', link: '/api' },
          { text: '请求实例', link: '/example' },
          { text: '配置', link: '/configuration' },
          { text: '文件系统挂载', link: '/mount' },
          { text: '编译', link: '/build' },
          { text: '拓展', link: '/scale' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/criyle/go-judge' },
      { icon: 'github', link: 'https://github.com/orgs/Bunane-Tech/repositories' }
    ]
  },
  locales: {
    root: {
      label: '中文',
      lang: 'cn',
    },
    en: {
      label: 'English',
      lang: 'en',
      title: "Judge Documentation",
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en' },
          { text: 'Documentation', link: '/en/install' }
        ],

        sidebar: [
          {
            text: 'Documentations',
            items: [
              { text: 'Install', link: '/en/install' },
              { text: 'Design', link: '/en/design' },
              { text: 'API', link: '/en/api' },
              { text: 'Example Requests', link: '/en/example' },
              { text: 'Configuration', link: '/en/configuration' },
              { text: 'File System Mount', link: '/en/mount' },
              { text: 'Build', link: '/en/build' },
              { text: 'Scale', link: '/en/scale' },
            ]
          }
        ],
      }
    }
  }
})
