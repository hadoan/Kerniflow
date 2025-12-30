#!/bin/bash
# Helper script to identify which modules still need DI fixes

echo "Modules that import KernelModule (already fixed):"
grep -l "import.*KernelModule" src/modules/**/*.module.ts 2>/dev/null | sed 's|.*/||' | sort

echo ""
echo "Modules with duplicate ID_GENERATOR_TOKEN provider (need fixing):"
grep -l "{ provide: ID_GENERATOR_TOKEN" src/modules/**/*.module.ts 2>/dev/null | sed 's|.*/||' | sort

echo ""
echo "Modules with duplicate SystemIdGenerator (need fixing):"
grep -l "SystemIdGenerator," src/modules/**/*.module.ts 2>/dev/null | sed 's|.*/||' | sort
