const program = require('commander');
const runConvertToJSON = require('./json');
const runValidateSchema = require('./validate');
const runResolveSchema = require('./resolve');
const runCompileSchema = require('./compile');
const runConvertToOAS2 = require('./convertOAS2');
const runConvertToOAS3 = require('./convertOAS3');
const runConvertToAvro = require('./convertAvro');
const runConvertToGraphQL = require('./convertGraphQL');
const { version } = require('../../version');

program.version(version);

program
  .command('validate <path>')
  .description(
    'validate given model. If a directory is provided it validates all models in the directory recursively.',
  )
  .action(path => runValidateSchema(path));

program
  .command('compile <dir>')
  .description(
    'compile all models in the given directory into one, recursive, resolving remote references',
  )
  .action(dir => runCompileSchema(dir));

program
  .command('resolve <modelPath>')
  .description('resolves given model remote references')
  .action(modelPath => runResolveSchema(modelPath));

program
  .command('oas2 <path>')
  .description(
    'convert given model or directory to OpenAPI Specification 2.0 definitions',
  )
  .option(
    '-o, --out <oas2Path>',
    'Replace existing OAS2 file definitions section instead of writing to stdout',
  )
  .action((path, command) => runConvertToOAS2(path, command.out));

program
  .command('oas3 <path>')
  .description(
    'convert given model or directory to OpenAPI Specification 3 definitions',
  )
  .option(
    '-o, --out <oas3Path>',
    'Replace existing OAS3 file definitions section instead of writing to stdout',
  )
  .action((path, command) => runConvertToOAS3(path, command.out));

program
  .command('json <modelPath>')
  .description('convert given model to JSON Schema (JSON)')
  .action(modelPath => runConvertToJSON(modelPath));

program
  .command('graphql <modelPath>')
  .description('convert given model to GraphQL Schema')
  .action(modelPath => {
    runConvertToGraphQL(modelPath);
  });

program
  .command('avro <modelPath>')
  .description('convert given model to Avro schema')
  .action(modelPath => {
    runConvertToAvro(modelPath);
  });

program.parse(process.argv);
