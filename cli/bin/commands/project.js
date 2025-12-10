const { Command } = require('commander')
const chalk = require('chalk')
const inquirer = require('inquirer')
const { apiClient } = require('../utils/api')

module.exports = (program) => {
  const projectCmd = program
    .command('project')
    .description('项目管理命令')

  projectCmd
    .command('list')
    .description('列出所有项目')
    .action(async () => {
      try {
        const response = await apiClient.get('/projects')
        console.log(chalk.green('项目列表:'))
        console.table(response.data.projects)
      } catch (error) {
        console.error(chalk.red('获取项目列表失败:', error.message))
      }
    })

  projectCmd
    .command('create')
    .description('创建新项目')
    .action(async () => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: '项目名称:',
        },
        {
          type: 'input',
          name: 'description',
          message: '项目描述:',
        },
      ])

      try {
        const response = await apiClient.post('/projects', answers)
        console.log(chalk.green('项目创建成功!'))
        console.log(response.data)
      } catch (error) {
        console.error(chalk.red('创建项目失败:', error.message))
      }
    })

  projectCmd
    .command('get <id>')
    .description('获取项目详情')
    .action(async (id) => {
      try {
        const response = await apiClient.get(`/projects/${id}`)
        console.log(chalk.green('项目详情:'))
        console.log(response.data)
      } catch (error) {
        console.error(chalk.red('获取项目详情失败:', error.message))
      }
    })
}

