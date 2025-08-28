
```sh
npm install
npm run dev
npm run build
```

```nginx.conf
server {
    listen 3000;

    # 静态资源路径
    root .vitepress/dist;
    index index.html;

    # 核心修复：路由重定向
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 可选优化配置
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;  # 静态资源缓存
        add_header Cache-Control "public";
    }
}
```