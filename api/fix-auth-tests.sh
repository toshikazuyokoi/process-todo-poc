#!/bin/bash

# Fix comment controller integration tests
sed -i 's/\.post('\''\/api\/comments'\'')/\.post('\''\/api\/comments'\'')\n        \.set(AuthTestHelper.getAuthHeader())/g' src/interfaces/controllers/comment/comment.controller.integration.spec.ts
sed -i 's/\.get(`\/api\/comments/\.get(`\/api\/comments/g' src/interfaces/controllers/comment/comment.controller.integration.spec.ts
sed -i 's/\.get(`\/api\/comments\/steps\/${/\.get(`\/api\/comments\/steps\/${\n        \.set(AuthTestHelper.getAuthHeader())\n        \.get(`\/api\/comments\/steps\/${/g' src/interfaces/controllers/comment/comment.controller.integration.spec.ts
sed -i 's/\.put(`\/api\/comments/\.put(`\/api\/comments/g' src/interfaces/controllers/comment/comment.controller.integration.spec.ts  
sed -i 's/\.delete(`\/api\/comments/\.delete(`\/api\/comments/g' src/interfaces/controllers/comment/comment.controller.integration.spec.ts

# Fix kanban controller integration tests
sed -i '8a\import { AuthTestHelper } from '\''../../../../test/helpers/auth.helper'\'';' src/interfaces/controllers/kanban/kanban.controller.integration.spec.ts
sed -i 's/\.get('\''\/api\/kanban/\.get('\''\/api\/kanban/g' src/interfaces/controllers/kanban/kanban.controller.integration.spec.ts
sed -i 's/\.get(`\/api\/kanban/\.get(`\/api\/kanban/g' src/interfaces/controllers/kanban/kanban.controller.integration.spec.ts

# Fix step controller integration tests  
sed -i '7a\import { AuthTestHelper } from '\''../../../../test/helpers/auth.helper'\'';' src/interfaces/controllers/step/step.controller.integration.spec.ts
sed -i 's/\.get(`\/api\/steps/\.get(`\/api\/steps/g' src/interfaces/controllers/step/step.controller.integration.spec.ts
sed -i 's/\.put(`\/api\/steps/\.put(`\/api\/steps/g' src/interfaces/controllers/step/step.controller.integration.spec.ts
sed -i 's/\.patch('\''\/api\/steps/\.patch('\''\/api\/steps/g' src/interfaces/controllers/step/step.controller.integration.spec.ts