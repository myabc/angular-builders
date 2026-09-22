import * as path from 'node:path';
import { BuilderContext, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import { executeUnitTestBuilder, UnitTestBuilderOptions } from '@angular/build';
import { getSystemPath, json, normalize } from '@angular-devkit/core';
import { from, switchMap } from 'rxjs';

import { loadPlugins } from '../load-plugins';
import {
  CustomEsbuildApplicationSchema,
  CustomEsbuildUnitTestSchema,
} from '../custom-esbuild-schema';

// Angular CLI only skips filling unset array options with `[]` for `@angular/build:*`
// builders. `@angular/build` treats an empty array as user-provided (e.g. `[]` for
// `coverageReporters` runs no reporter and `[]` for `reporters` discards the ones set
// in the Vitest config file), so empty arrays have to reach it as `undefined`, exactly
// as they do for `@angular/build:unit-test`.
function dropEmptyArrayOptions(options: CustomEsbuildUnitTestSchema) {
  for (const option of Object.keys(options) as (keyof CustomEsbuildUnitTestSchema)[]) {
    const value = options[option];

    if (Array.isArray(value) && !value.length) {
      delete options[option];
    }
  }
}

export function executeCustomEsbuildUnitTestBuilder(
  options: CustomEsbuildUnitTestSchema,
  context: BuilderContext
) {
  dropEmptyArrayOptions(options);

  const buildTarget = targetFromTargetString(options.buildTarget);

  async function getBuildTargetOptions() {
    return (await context.getTargetOptions(
      buildTarget
    )) as unknown as CustomEsbuildApplicationSchema;
  }

  const workspaceRoot = getSystemPath(normalize(context.workspaceRoot));
  const tsConfig = path.join(workspaceRoot, options.tsConfig);

  return from(getBuildTargetOptions()).pipe(
    switchMap(async buildOptions => {
      const codePlugins = await loadPlugins(
        buildOptions.plugins,
        workspaceRoot,
        tsConfig,
        context.logger,
        options,
        context.target
      );

      return { codePlugins };
    }),
    switchMap(extensions =>
      executeUnitTestBuilder(
        { ...options, runner: 'vitest' as UnitTestBuilderOptions['runner'] },
        context,
        extensions
      )
    )
  );
}

export default createBuilder<json.JsonObject & CustomEsbuildUnitTestSchema>(
  executeCustomEsbuildUnitTestBuilder
);
