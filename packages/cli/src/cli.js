const program = require('commander')
const package = require('../package.json')
const runJSON = require('./commands/json')
const runValidateSchema = require('./commands/validateSchema')
const runCompileSchema = require('./commands/compileSchema')
const runConvertToOAS2 = require('./commands/convertOAS2')

function defineProgram({ description }, callProgram) {
  program
    .version(package.version)

  callProgram(program)
  program.parse(process.argv)

  if (!process.argv.slice(2).length) {
    program.help()
    process.exit(0)
  }
}

defineProgram({
  description: 'Supermodel command tool'
}, function (program) {

  program
    .command('json <yamlSchemaFile>')
    .description('Convert YAML representation of a JSON Schema into JSON representation.')
    .action((yamlSchemaFile) => runJSON(yamlSchemaFile))

  program
    .command('validate-schema <yamlSchemaFile>')
    .description('Validate JSON Schema YAML representation.')
    .action((yamlSchemaFile) => runValidateSchema(yamlSchemaFile))

  program
    .command('compile-schema <yamlSchemaFile>')
    .description('Compile JSON Schema YAML representation, resolving every references.')
    .action((yamlSchemaFile) => runCompileSchema(yamlSchemaFile))

  program
    .command('oas2 <yamlSchemaFile>')
    .description('Convert JSON Schema YAML representation to OpenAPI Specification 2.0 definitions. Doesn\'t resolve remote schema references.')
    .action((yamlSchemaFile) => runConvertToOAS2(yamlSchemaFile))
        
})