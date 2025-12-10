const { Command } = require('commander')
const chalk = require('chalk')
const ora = require('ora')
const { apiClient } = require('../utils/api')

module.exports = (program) => {
  const executionCmd = program
    .command('execution')
    .alias('exec')
    .description('测试执行管理命令')

  executionCmd
    .command('list')
    .option('-p, --project <id>', '项目ID')
    .description('列出测试执行')
    .action(async (options) => {
      try {
        const params = options.project ? { project_id: options.project } : {}
        const response = await apiClient.get('/test-executions', { params })
        console.log(chalk.green('测试执行列表:'))
        console.table(response.data.executions)
      } catch (error) {
        console.error(chalk.red('获取测试执行列表失败:', error.message))
      }
    })

  executionCmd
    .command('get <id>')
    .description('获取测试执行详情')
    .action(async (id) => {
      try {
        const response = await apiClient.get(`/test-executions/${id}`)
        console.log(chalk.green('测试执行详情:'))
        console.log(JSON.stringify(response.data, null, 2))
      } catch (error) {
        console.error(chalk.red('获取测试执行详情失败:', error.message))
      }
    })

  executionCmd
    .command('logs <id>')
    .description('获取测试执行日志')
    .action(async (id) => {
      const spinner = ora('获取日志中...').start()
      try {
        const response = await apiClient.get(`/test-executions/${id}/logs`)
        spinner.succeed('日志获取成功')
        console.log(response.data.logs.join('\n'))
      } catch (error) {
        spinner.fail('获取日志失败')
        console.error(chalk.red(error.message))
      }
    })
}

