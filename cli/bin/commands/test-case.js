const { Command } = require('commander')
const chalk = require('chalk')
const { apiClient } = require('../utils/api')

module.exports = (program) => {
  const testCaseCmd = program
    .command('test-case')
    .alias('tc')
    .description('测试用例管理命令')

  testCaseCmd
    .command('list')
    .option('-p, --project <id>', '项目ID')
    .description('列出测试用例')
    .action(async (options) => {
      try {
        const params = options.project ? { project_id: options.project } : {}
        const response = await apiClient.get('/test-cases', { params })
        console.log(chalk.green('测试用例列表:'))
        console.table(response.data.test_cases)
      } catch (error) {
        console.error(chalk.red('获取测试用例列表失败:', error.message))
      }
    })

  testCaseCmd
    .command('get <id>')
    .description('获取测试用例详情')
    .action(async (id) => {
      try {
        const response = await apiClient.get(`/test-cases/${id}`)
        console.log(chalk.green('测试用例详情:'))
        console.log(JSON.stringify(response.data, null, 2))
      } catch (error) {
        console.error(chalk.red('获取测试用例详情失败:', error.message))
      }
    })
}

