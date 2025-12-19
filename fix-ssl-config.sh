#!/bin/bash
# 修复 SSL 配置并确保所有请求使用 HTTPS

set -e

echo "=========================================="
echo "修复 SSL 配置 - 强制 HTTPS"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"
CERT_PATH="$PROJECT_PATH/nginx/ssl"
NGINX_CONF="/etc/nginx/conf.d/qualityguard.conf"

# 检查证书文件
echo "步骤 1: 检查 SSL 证书..."
if [ ! -f "$CERT_PATH/cert.pem" ] || [ ! -f "$CERT_PATH/key.pem" ]; then
    echo "❌ SSL 证书文件不存在"
    exit 1
fi

# 验证证书
echo "验证证书信息..."
openssl x509 -in "$CERT_PATH/cert.pem" -noout -subject -dates
echo "✅ 证书文件有效"
echo ""

# 更新 Nginx 配置
echo "步骤 2: 更新 Nginx 配置..."
cat > $NGINX_CONF << 'NGINX_EOF'
# HTTP 服务器 - 强制重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name zhihome.com.cn www.zhihome.com.cn;

    # 允许 Let's Encrypt 验证（如果需要）
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 所有其他 HTTP 请求强制重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name zhihome.com.cn www.zhihome.com.cn;

    # SSL 证书配置
    ssl_certificate /root/QualityGuard/nginx/ssl/cert.pem;
    ssl_certificate_key /root/QualityGuard/nginx/ssl/key.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # 安全头 - 强制 HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:;" always;

    # 日志
    access_log /var/log/nginx/qualityguard-access.log;
    error_log /var/log/nginx/qualityguard-error.log;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html/qualityguard;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 文档
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

echo "✅ Nginx 配置已更新"
echo ""

# 测试 Nginx 配置
echo "步骤 3: 测试 Nginx 配置..."
if nginx -t; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi
echo ""

# 重启 Nginx
echo "步骤 4: 重启 Nginx..."
systemctl restart nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx 已重启并运行"
else
    echo "❌ Nginx 启动失败"
    systemctl status nginx --no-pager -l
    exit 1
fi
echo ""

# 检查端口监听
echo "步骤 5: 检查端口监听..."
if netstat -tlnp | grep -q ":80 "; then
    echo "✅ HTTP (80) 端口正在监听"
else
    echo "⚠️ HTTP (80) 端口未监听"
fi

if netstat -tlnp | grep -q ":443 "; then
    echo "✅ HTTPS (443) 端口正在监听"
else
    echo "❌ HTTPS (443) 端口未监听"
    exit 1
fi
echo ""

# 测试 HTTPS 连接
echo "步骤 6: 测试 HTTPS 连接..."
if curl -k -I https://localhost 2>/dev/null | grep -q "HTTP"; then
    echo "✅ HTTPS 连接测试成功"
else
    echo "⚠️ HTTPS 连接测试失败（可能需要域名解析）"
fi
echo ""

# 显示证书信息
echo "步骤 7: 显示证书详细信息..."
echo "证书主题:"
openssl x509 -in "$CERT_PATH/cert.pem" -noout -subject
echo ""
echo "证书有效期:"
openssl x509 -in "$CERT_PATH/cert.pem" -noout -dates
echo ""
echo "证书颁发者:"
openssl x509 -in "$CERT_PATH/cert.pem" -noout -issuer
echo ""

echo "=========================================="
echo "🎉 SSL 配置修复完成！"
echo "=========================================="
echo ""
echo "✅ 配置摘要："
echo "  - HTTP (80) 端口：强制重定向到 HTTPS"
echo "  - HTTPS (443) 端口：已启用 SSL/TLS"
echo "  - 证书域名：zhihome.com.cn"
echo "  - 安全头：已配置 HSTS 和其他安全头"
echo ""
echo "🌐 访问地址："
echo "  - 前端: https://zhihome.com.cn"
echo "  - API: https://zhihome.com.cn/api/"
echo "  - API 文档: https://zhihome.com.cn/docs"
echo ""
echo "📝 验证命令："
echo "  curl -I http://zhihome.com.cn  # 应该返回 301 重定向"
echo "  curl -I https://zhihome.com.cn  # 应该返回 200 OK"
echo "  openssl s_client -connect zhihome.com.cn:443 -servername zhihome.com.cn"
echo ""
echo "✅ 所有 HTTP 请求将自动重定向到 HTTPS！"
