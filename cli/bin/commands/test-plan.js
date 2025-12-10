const { Command } = require('commander')
const chalk = require('chalk')
const { apiClient } = require('../utils/api')

module.exports = (program) => {
  const testPlanCmd = program
    .command('test-plan')
    .alias('tp')
    .description('测试计划管理命令')

  testPlanCmd
    .command('list')
    .option('-p, --project <id>', '项目ID')
    .description('列出测试计划')
    .action(async (options) => {
      try {
        const params = options.project ? { project_id: options.project } : {}
        const response = await apiClient.get('/test-plans', { params })
        console.log(chalk.green('测试计划列表:'))
        console.table(response.data.test_plans)
      } catch (error) {
        console.error(chalk.red('获取测试计划列表失败:', error.message))
      }
    })

  testPlanCmd
    .command('execute <id>')
    .description('执行测试计划')
    .action(async (id) => {
      try {
        const response = await apiClient.post(`/test-plans/${id}/execute`)
        console.log(chalk.green('测试计划执行已启动!'))
        console.log(`执行ID: ${response.data.execution_id}`)
      } catch (error) {
        console.error(chalk.red('执行测试计划失败:', error.message))
      }
    })
}

