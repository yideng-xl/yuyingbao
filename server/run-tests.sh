#!/bin/bash

# 育婴宝 - 自动化测试运行脚本
# 运行完整的测试套件

echo "🚀 开始运行育婴宝项目的自动化测试套件..."
echo "========================================"

# 检查Java和Maven环境
echo "📋 检查环境..."
java -version
mvn -version

# 切换到项目目录
cd "$(dirname "$0")"

# 清理之前的构建
echo "🧹 清理之前的构建..."
mvn clean

# 编译项目
echo "🔨 编译项目..."
mvn compile test-compile

# 运行不同类型的测试
echo "🧪 运行测试套件..."

echo "1️⃣ 运行单元测试..."
mvn test -Dtest="*Test" -DfailIfNoTests=false

echo "2️⃣ 运行集成测试..."
mvn test -Dtest="*IntegrationTest" -DfailIfNoTests=false

echo "3️⃣ 运行安全测试..."
mvn test -Dtest="SecurityTest" -DfailIfNoTests=false

echo "4️⃣ 运行端到端测试..."
mvn test -Dtest="EndToEndIntegrationTest" -DfailIfNoTests=false

# 运行所有测试并生成报告
echo "📊 生成测试报告..."
mvn test

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 所有测试通过！"
    echo "📈 测试报告位置: target/surefire-reports/"
    echo "📋 测试覆盖率报告将在target/site/jacoco/中生成"
else
    echo "❌ 部分测试失败，请查看详细日志"
    exit 1
fi

echo "========================================"
echo "🎉 测试套件运行完成！"