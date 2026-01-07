#!/bin/bash
# UI自动化API测试脚本

set -e

API_BASE="${API_BASE:-http://localhost:8000/api/v1}"
TOKEN="${TOKEN:-}"

echo "=========================================="
echo "UI自动化API测试"
echo "=========================================="
echo ""

if [ -z "$TOKEN" ]; then
    echo "⚠️  未提供TOKEN，部分测试可能失败"
    echo "   使用方法: TOKEN=your_token ./test-ui-automation-api.sh"
    echo ""
fi

# 测试页面对象API
echo "测试 1: 获取页面对象列表..."
if [ -n "$TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/page-objects" \
        -H "Authorization: Bearer $TOKEN")
else
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/page-objects")
fi

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "✅ 页面对象列表API正常"
    echo "   响应: $body" | head -c 100
    echo "..."
else
    echo "❌ 页面对象列表API失败 (HTTP $http_code)"
    echo "   响应: $body"
fi
echo ""

# 测试UI元素API
echo "测试 2: 获取UI元素列表..."
if [ -n "$TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/ui-elements" \
        -H "Authorization: Bearer $TOKEN")
else
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/ui-elements")
fi

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "✅ UI元素列表API正常"
    echo "   响应: $body" | head -c 100
    echo "..."
else
    echo "❌ UI元素列表API失败 (HTTP $http_code)"
    echo "   响应: $body"
fi
echo ""

echo "=========================================="
echo "✅ API测试完成"
echo "=========================================="

