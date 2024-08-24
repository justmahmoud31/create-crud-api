import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Schema } from '../../interfaces';

function runSequelizeScripts(projectName: string) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      'sh',
      [
        '-c',
        `cd ${projectName} && npm install sequelize sequelize-cli && npx sequelize init && npx sequelize db:migrate`,
      ],
      { stdio: 'inherit' },
    );

    p.on('data', (data) => {
      console.log(data.toString());
    });

    p.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      resolve('done');
    });

    p.on('error', (err) => {
      console.log(err);
      reject(err);
    });
  });
}

function fieldTypeMapper(field: string) {
  const typeMapping: { [key: string]: string } = {
    string: 'STRING',
    int: 'INTEGER',
    boolean: 'BOOLEAN',
  };
  return typeMapping[field] || 'STRING';
}

export default async function createSequelize(
  projectName: string,
  schema: Schema,
): Promise<void> {
  const projectDir = path.join(process.cwd(), projectName);
  for (const [modelName, fields] of Object.entries(schema)) {
    const modelFileContent = `
      module.exports = (sequelize, DataTypes) => {
        const ${modelName} = sequelize.define('${modelName}', {
          ${Object.entries(fields).map(
            ([fieldName, fieldType]) =>
              `${fieldName}: { type: DataTypes.${fieldTypeMapper(fieldType)} }`,
          ).join(',\n          ')}
        });
        return ${modelName};
      };
    `;
    const modelFilePath = path.join(projectDir, `models/${modelName}.js`);
    fs.outputFileSync(modelFilePath, modelFileContent.trim());
  }
  await runSequelizeScripts(projectName);
}
