#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const { version } = require('../package.json')

// 导入命令模块
const projectCommands = require('./commands/project')
const testCaseCommands = require('./commands/test-case')
const testPlanCommands = require('./commands/test-plan')
const executionCommands = require('./commands/execution')

program
  .name('qg')
  .description('QualityGuard CLI - 测试自动化平台命令行工具')
  .version(version)

// 注册命令
projectCommands(program)
testCaseCommands(program)
testPlanCommands(program)
executionCommands(program)

// 错误处理
program.on('command:*', () => {
  console.error(chalk.red(`未知命令: ${program.args.join(' ')}`))
  console.error(`使用 ${chalk.yellow('qg --help')} 查看可用命令`)
  process.exit(1)
})

program.parse()

