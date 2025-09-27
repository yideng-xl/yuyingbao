# 多阶段构建 Dockerfile for 育婴宝后端服务
# 使用阿里云镜像加速

# 构建阶段
FROM maven:3.9-eclipse-temurin-17 AS builder

# 设置工作目录
WORKDIR /app

# 复制Maven配置文件
COPY pom.xml .
COPY src ./src

# 配置Maven阿里云镜像
RUN mkdir -p /root/.m2 && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /root/.m2/settings.xml && \
    echo '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"' >> /root/.m2/settings.xml && \
    echo '          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' >> /root/.m2/settings.xml && \
    echo '          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0' >> /root/.m2/settings.xml && \
    echo '                              http://maven.apache.org/xsd/settings-1.0.0.xsd">' >> /root/.m2/settings.xml && \
    echo '  <mirrors>' >> /root/.m2/settings.xml && \
    echo '    <mirror>' >> /root/.m2/settings.xml && \
    echo '      <id>aliyunmaven</id>' >> /root/.m2/settings.xml && \
    echo '      <mirrorOf>*</mirrorOf>' >> /root/.m2/settings.xml && \
    echo '      <name>阿里云公共仓库</name>' >> /root/.m2/settings.xml && \
    echo '      <url>https://maven.aliyun.com/repository/public</url>' >> /root/.m2/settings.xml && \
    echo '    </mirror>' >> /root/.m2/settings.xml && \
    echo '  </mirrors>' >> /root/.m2/settings.xml && \
    echo '</settings>' >> /root/.m2/settings.xml

# 下载依赖（利用Docker缓存）
RUN mvn dependency:go-offline -B

# 编译和打包应用
RUN mvn clean package -DskipTests -Dmaven.test.skip=true -B

# 运行阶段
FROM eclipse-temurin:17-jre-jammy

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建应用用户
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser

# 设置工作目录
WORKDIR /app

# 从构建阶段复制jar文件
COPY --from=builder /app/target/*.jar app.jar

# 更改文件所有者
RUN chown -R appuser:appgroup /app

# 切换到非root用户
USER appuser

# 健康检查 - 针对低配置服务器调整
HEALTHCHECK --interval=45s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:8080/api/actuator/health || exit 1

# 暴露端口
EXPOSE 8080

# JVM优化参数 - 针对2G内存服务器优化
ENV JAVA_OPTS="-Xms256m -Xmx768m -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication -XX:+OptimizeStringConcat -Djava.awt.headless=true -Djava.security.egd=file:/dev/./urandom -Dspring.jmx.enabled=false"

# 启动命令
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]