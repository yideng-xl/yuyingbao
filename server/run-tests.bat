@echo off
chcp 65001 > nul

REM 育婴宝 - 自动化测试运行脚本 (Windows版本)
REM 运行完整的测试套件

echo 🚀 开始运行育婴宝项目的自动化测试套件...
echo ========================================

REM 检查Java和Maven环境
echo 📋 检查环境...
java -version
mvn -version

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 清理之前的构建
echo 🧹 清理之前的构建...
mvn clean

REM 编译项目
echo 🔨 编译项目...
mvn compile test-compile

REM 运行不同类型的测试
echo 🧪 运行测试套件...

echo 1️⃣ 运行认证测试...
mvn test -Dtest=AuthControllerTest -DfailIfNoTests=false

echo 2️⃣ 运行家庭管理测试...
mvn test -Dtest=FamilyControllerTest -DfailIfNoTests=false

echo 3️⃣ 运行宝宝管理测试...
mvn test -Dtest=BabyControllerTest -DfailIfNoTests=false

echo 4️⃣ 运行记录管理测试...
mvn test -Dtest=RecordControllerTest -DfailIfNoTests=false

echo 5️⃣ 运行安全测试...
mvn test -Dtest=SecurityTest -DfailIfNoTests=false

echo 6️⃣ 运行端到端集成测试...
mvn test -Dtest=EndToEndIntegrationTest -DfailIfNoTests=false

REM 运行所有测试并生成报告
echo 📊 生成完整测试报告...
mvn test

REM 检查测试结果
if %ERRORLEVEL% EQU 0 (
    echo ✅ 所有测试通过！
    echo 📈 测试报告位置: target\surefire-reports\
    echo 📋 可以使用 mvn jacoco:report 生成覆盖率报告
) else (
    echo ❌ 部分测试失败，请查看详细日志
    exit /b 1
)

echo ========================================
echo 🎉 测试套件运行完成！
pause