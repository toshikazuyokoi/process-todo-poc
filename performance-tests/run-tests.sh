#!/bin/bash

# パフォーマンステスト実行スクリプト

echo "================================"
echo "Performance Test Suite"
echo "================================"
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果ディレクトリ作成
RESULTS_DIR="./performance-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p $RESULTS_DIR

# 1. 前提条件チェック
echo "1. Checking prerequisites..."

# Node.jsチェック
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js is installed${NC}"

# k6チェック
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}⚠ k6 is not installed. Installing...${NC}"
    
    # OS判定とk6インストール
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        brew install k6
    else
        echo -e "${RED}✗ Unsupported OS for automatic k6 installation${NC}"
        echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
fi
echo -e "${GREEN}✓ k6 is installed${NC}"

# Lighthouseチェック
if ! npm list lighthouse &> /dev/null; then
    echo -e "${YELLOW}⚠ Lighthouse is not installed. Installing...${NC}"
    npm install -g lighthouse chrome-launcher
fi
echo -e "${GREEN}✓ Lighthouse is installed${NC}"

echo ""

# 2. サービス起動確認
echo "2. Checking services..."

# APIサービス確認
API_URL="http://localhost:3001/health"
if curl -f -s $API_URL > /dev/null; then
    echo -e "${GREEN}✓ API service is running${NC}"
else
    echo -e "${RED}✗ API service is not running${NC}"
    echo "Please start the API service: cd api && npm run start:dev"
    exit 1
fi

# Webサービス確認
WEB_URL="http://localhost:3000"
if curl -f -s $WEB_URL > /dev/null; then
    echo -e "${GREEN}✓ Web service is running${NC}"
else
    echo -e "${RED}✗ Web service is not running${NC}"
    echo "Please start the web service: cd web && npm run dev"
    exit 1
fi

echo ""

# 3. 負荷テスト実行
echo "3. Running Load Tests with k6..."
echo "================================"

k6 run \
    --out json=$RESULTS_DIR/k6-results.json \
    --summary-export=$RESULTS_DIR/k6-summary.json \
    load-test.js

K6_EXIT_CODE=$?

if [ $K6_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Load tests passed${NC}"
else
    echo -e "${RED}✗ Load tests failed${NC}"
fi

echo ""

# 4. Lighthouseテスト実行
echo "4. Running Lighthouse Tests..."
echo "================================"

node lighthouse-test.js

LIGHTHOUSE_EXIT_CODE=$?

if [ $LIGHTHOUSE_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Lighthouse tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some Lighthouse tests need attention${NC}"
fi

echo ""

# 5. Playwrightパフォーマンステスト実行
echo "5. Running E2E Performance Tests..."
echo "================================"

cd ../web
npm run test:e2e -- --grep "Performance Tests"
PLAYWRIGHT_EXIT_CODE=$?
cd ../performance-tests

if [ $PLAYWRIGHT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ E2E performance tests passed${NC}"
else
    echo -e "${RED}✗ E2E performance tests failed${NC}"
fi

echo ""

# 6. 結果サマリー
echo "================================"
echo "Test Summary"
echo "================================"

TOTAL_TESTS=3
PASSED_TESTS=0
FAILED_TESTS=0

if [ $K6_EXIT_CODE -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

if [ $LIGHTHOUSE_EXIT_CODE -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

if [ $PLAYWRIGHT_EXIT_CODE -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

echo ""
echo "Results saved to: $RESULTS_DIR"

# 最終結果
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All performance tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some performance tests failed${NC}"
    exit 1
fi