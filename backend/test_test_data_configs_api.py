"""
测试数据配置API测试脚本
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"
TEST_TOKEN = None  # 需要在测试前设置


async def get_token():
    """获取认证token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": "admin",
                "password": "admin123"
            }
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"登录失败: {response.status_code}, {response.text}")
            return None


async def test_create_config(client, headers):
    """测试创建配置"""
    print("\n=== 测试创建配置 ===")
    
    test_data = {
        "name": "测试数据配置1",
        "description": "这是一个测试配置",
        "project_id": 1,
        "data": [
            {
                "request": {
                    "Codes": "R-lower",
                    "DamageToothCount": 1,
                    "DamageAreaCount": 2
                },
                "assertions": [
                    {
                        "type": "smart_match",
                        "field": "PassedRules",
                        "expected": "test"
                    }
                ]
            },
            {
                "request": {
                    "Codes": "L-lower",
                    "DamageToothCount": 3
                },
                "assertions": []
            }
        ],
        "is_active": True
    }
    
    response = await client.post(
        f"{BASE_URL}/test-data-configs",
        json=test_data,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"创建成功，配置ID: {data['id']}")
        print(f"配置名称: {data['name']}")
        print(f"数据行数: {len(data['data'])}")
        return data['id']
    else:
        print(f"创建失败: {response.text}")
        return None


async def test_get_configs(client, headers, project_id=None):
    """测试获取配置列表"""
    print("\n=== 测试获取配置列表 ===")
    
    params = {}
    if project_id:
        params["project_id"] = project_id
    
    response = await client.get(
        f"{BASE_URL}/test-data-configs",
        params=params,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"获取成功，共 {len(data)} 个配置")
        for config in data:
            print(f"  - {config['name']} (ID: {config['id']}, 数据行数: {config['data_count']}, 关联用例: {config['associated_case_count']})")
        return data
    else:
        print(f"获取失败: {response.text}")
        return []


async def test_get_config(client, headers, config_id):
    """测试获取配置详情"""
    print(f"\n=== 测试获取配置详情 (ID: {config_id}) ===")
    
    response = await client.get(
        f"{BASE_URL}/test-data-configs/{config_id}",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"获取成功")
        print(f"配置名称: {data['name']}")
        print(f"数据行数: {len(data['data'])}")
        print(f"第一行数据: {json.dumps(data['data'][0] if data['data'] else {}, ensure_ascii=False, indent=2)}")
        return data
    else:
        print(f"获取失败: {response.text}")
        return None


async def test_update_config(client, headers, config_id):
    """测试更新配置"""
    print(f"\n=== 测试更新配置 (ID: {config_id}) ===")
    
    update_data = {
        "name": "测试数据配置1-已更新",
        "description": "更新后的描述",
        "data": [
            {
                "request": {
                    "Codes": "UPDATED",
                    "DamageToothCount": 999
                },
                "assertions": [
                    {
                        "type": "json_path",
                        "path": "$.status",
                        "expected": "success"
                    }
                ]
            }
        ]
    }
    
    response = await client.put(
        f"{BASE_URL}/test-data-configs/{config_id}",
        json=update_data,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"更新成功")
        print(f"新名称: {data['name']}")
        print(f"新数据行数: {len(data['data'])}")
        return data
    else:
        print(f"更新失败: {response.text}")
        return None


async def test_associate_case(client, headers, test_case_id, config_id):
    """测试关联用例"""
    print(f"\n=== 测试关联用例 (用例ID: {test_case_id}, 配置ID: {config_id}) ===")
    
    response = await client.post(
        f"{BASE_URL}/test-cases/{test_case_id}/test-data-configs",
        json={"test_data_config_id": config_id},
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"关联成功")
        print(f"用例: {data['test_case_name']}")
        print(f"配置: {data['test_data_config_name']}")
        return True
    else:
        print(f"关联失败: {response.text}")
        return False


async def test_get_case_configs(client, headers, test_case_id):
    """测试获取用例关联的配置"""
    print(f"\n=== 测试获取用例关联的配置 (用例ID: {test_case_id}) ===")
    
    response = await client.get(
        f"{BASE_URL}/test-cases/{test_case_id}/test-data-configs",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"获取成功，共 {len(data)} 个配置")
        for config in data:
            print(f"  - {config['name']} (ID: {config['id']}, 数据行数: {len(config['data'])})")
        return data
    else:
        print(f"获取失败: {response.text}")
        return []


async def test_get_usage(client, headers, config_id):
    """测试获取配置使用情况"""
    print(f"\n=== 测试获取配置使用情况 (配置ID: {config_id}) ===")
    
    response = await client.get(
        f"{BASE_URL}/test-data-configs/{config_id}/usage",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"获取成功，共 {len(data)} 个用例使用")
        for usage in data:
            print(f"  - {usage['test_case_name']} (用例ID: {usage['test_case_id']})")
        return data
    else:
        print(f"获取失败: {response.text}")
        return []


async def test_disassociate_case(client, headers, test_case_id, config_id):
    """测试取消关联"""
    print(f"\n=== 测试取消关联 (用例ID: {test_case_id}, 配置ID: {config_id}) ===")
    
    response = await client.delete(
        f"{BASE_URL}/test-cases/{test_case_id}/test-data-configs/{config_id}",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 204:
        print("取消关联成功")
        return True
    else:
        print(f"取消关联失败: {response.text}")
        return False


async def test_delete_config(client, headers, config_id):
    """测试删除配置"""
    print(f"\n=== 测试删除配置 (ID: {config_id}) ===")
    
    response = await client.delete(
        f"{BASE_URL}/test-data-configs/{config_id}",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 204:
        print("删除成功")
        return True
    else:
        print(f"删除失败: {response.text}")
        return False


async def main():
    """主测试函数"""
    print("=" * 50)
    print("测试数据配置API测试")
    print("=" * 50)
    
    # 获取token
    token = await get_token()
    if not token:
        print("无法获取token，测试终止")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. 创建配置
        config_id = await test_create_config(client, headers)
        if not config_id:
            print("创建配置失败，测试终止")
            return
        
        # 2. 获取配置列表
        await test_get_configs(client, headers, project_id=1)
        
        # 3. 获取配置详情
        await test_get_config(client, headers, config_id)
        
        # 4. 更新配置
        await test_update_config(client, headers, config_id)
        
        # 5. 获取用例列表（先获取一个用例ID用于测试关联）
        print("\n=== 获取测试用例列表 ===")
        case_response = await client.get(
            f"{BASE_URL}/test-cases",
            params={"project_id": 1, "limit": 1},
            headers=headers
        )
        test_case_id = None
        if case_response.status_code == 200:
            cases = case_response.json()
            if cases:
                test_case_id = cases[0]['id']
                print(f"使用用例ID: {test_case_id} ({cases[0]['name']})")
        
        if test_case_id:
            # 6. 关联用例
            await test_associate_case(client, headers, test_case_id, config_id)
            
            # 7. 获取用例关联的配置
            await test_get_case_configs(client, headers, test_case_id)
            
            # 8. 获取配置使用情况
            await test_get_usage(client, headers, config_id)
            
            # 9. 取消关联
            await test_disassociate_case(client, headers, test_case_id, config_id)
        else:
            print("没有可用的测试用例，跳过关联测试")
        
        # 10. 删除配置
        await test_delete_config(client, headers, config_id)
        
        print("\n" + "=" * 50)
        print("测试完成")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())

