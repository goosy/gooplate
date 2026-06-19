// build.js
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { rolldown } from 'rolldown';
import ts from 'typescript';
import pkg from '../package.json' with { type: 'json' };

// ========== 1. rolldown 打包 ==========
const inputOptions = {
    input: 'src/index.js',
    plugins: [],
    external: ['fs', 'path', 'net'],
};
const outputOptionsList = [
    { file: pkg.exports.import, format: 'es' },
    { file: pkg.exports.require, format: 'cjs' },
];

let bundle;
let buildFailed = false;

try {
    bundle = await rolldown(inputOptions);
    for (const outputOptions of outputOptionsList) {
        await bundle.write(outputOptions);
        console.log(`file ${outputOptions.file} generated!`);
    }
} catch (error) {
    buildFailed = true;
    console.error(error);
}

if (bundle) await bundle.close();
if (buildFailed) process.exit(1);

// ========== 2. tsc API 生成 d.ts ==========
const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
if (!configPath) {
    console.error('tsconfig.json not found');
    process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
    console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    process.cwd()
);

// 强制覆盖选项：只生成 d.ts，输出到 types/（临时）
const compilerOptions = {
    ...parsedConfig.options,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: 'types',
};

const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: compilerOptions,
});

// 自定义写入回调：把 types/index.d.ts 直接写到 lib/index.d.ts，跳过临时目录
const emitResult = program.emit(undefined, (fileName, data) => {
    if (fileName.endsWith('.d.ts')) {
        // 把 types/ 路径映射到 lib/
        const targetPath = fileName.replace(/^types[/\\]/, 'lib/');
        mkdir(dirname(targetPath), { recursive: true }).then(() =>
            writeFile(targetPath, data, 'utf-8')
        ).then(() =>
            console.log(`generated: ${targetPath}`)
        );
    }
});

const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => ts.sys.newLine,
    });
    console.error(formatted);
}

if (emitResult.emitSkipped) {
    process.exit(1);
}

// ========== 3. 生成 mod.ts ==========
await writeFile('lib/mod.ts', 'export * from "./index.js";\n');
console.log('generated: lib/mod.ts');
