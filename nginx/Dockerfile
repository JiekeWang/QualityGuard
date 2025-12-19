FROM registry.cn-hangzhou.aliyuncs.com/acs/nginx:alpine

# 复制配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# 创建 SSL 证书目录
RUN mkdir -p /etc/nginx/ssl

# 暴露端口
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

