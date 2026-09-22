import { BuilderContext } from '@angular-devkit/architect';
import { executeUnitTestBuilder } from '@angular/build';
import { firstValueFrom, of } from 'rxjs';

import { CustomEsbuildUnitTestSchema } from '../custom-esbuild-schema';
import { executeCustomEsbuildUnitTestBuilder } from './index';

jest.mock('@angular/build', () => ({ executeUnitTestBuilder: jest.fn() }));
jest.mock('../load-plugins', () => ({ loadPlugins: jest.fn().mockResolvedValue([]) }));

const mockedExecuteUnitTestBuilder = executeUnitTestBuilder as jest.MockedFunction<
  typeof executeUnitTestBuilder
>;

describe('executeCustomEsbuildUnitTestBuilder', () => {
  const context = {
    workspaceRoot: '/workspace',
    logger: {},
    target: { project: 'app', target: 'test' },
    getTargetOptions: jest.fn().mockResolvedValue({}),
  } as unknown as BuilderContext;

  const baseOptions = {
    buildTarget: 'app:build',
    tsConfig: 'tsconfig.spec.json',
  } as CustomEsbuildUnitTestSchema;

  async function delegatedOptions(options: Partial<CustomEsbuildUnitTestSchema>) {
    await firstValueFrom(
      executeCustomEsbuildUnitTestBuilder({ ...baseOptions, ...options }, context)
    );

    return mockedExecuteUnitTestBuilder.mock.calls[0][0];
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedExecuteUnitTestBuilder.mockReturnValue(of({ success: true }) as never);
  });

  // Angular CLI fills unset array options with `[]` for every builder that is not
  // `@angular/build:*`, and `@angular/build` treats an empty array as user-provided.
  it.each([
    'browsers',
    'coverageInclude',
    'coverageExclude',
    'coverageReporters',
    'reporters',
    'setupFiles',
    'exclude',
  ] as const)('should not pass an empty %s array to the Angular builder', async option => {
    const delegated = await delegatedOptions({ [option]: [] });

    expect(delegated).not.toHaveProperty(option);
  });

  it('should pass non-empty array options to the Angular builder', async () => {
    const delegated = await delegatedOptions({
      browsers: ['chromium'],
      coverageInclude: ['src/**/*.ts'],
      coverageExclude: ['src/**/*.stories.ts'],
      coverageReporters: ['html'] as CustomEsbuildUnitTestSchema['coverageReporters'],
      reporters: ['junit'] as CustomEsbuildUnitTestSchema['reporters'],
      setupFiles: ['src/test-setup.ts'],
    });

    expect(delegated).toMatchObject({
      browsers: ['chromium'],
      coverageInclude: ['src/**/*.ts'],
      coverageExclude: ['src/**/*.stories.ts'],
      coverageReporters: ['html'],
      reporters: ['junit'],
      setupFiles: ['src/test-setup.ts'],
    });
  });

  it('should force the vitest runner', async () => {
    const delegated = await delegatedOptions({});

    expect(delegated.runner).toBe('vitest');
  });
});
