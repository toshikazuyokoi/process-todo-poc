# AIエージェント機能 - シーケンス図設計書 v1.2

## 概要

本ドキュメントは、AIエージェント支援テンプレート作成機能の主要フローにおけるメソッド呼び出しシーケンスを詳細に定義します。
各オブジェクト間の相互作用、メソッド呼び出しのタイミング、データフローを明確化します。

## 関連ドキュメント

- [クラス図設計書](./ai_agent_class_diagram.md) - 全クラスのメソッド・プロパティ詳細
- [技術設計書](./ai_agent_technical_design.md) - 全体アーキテクチャ・API設計
- [Enum・型定義書](./ai_agent_enums_types.md) - 型安全性確保のための定義

## 主要シーケンス図

### 1. セッション開始フロー

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AIAgentController
    participant UseCase as StartInterviewSessionUseCase
    participant RateLimit as AIRateLimitService
    participant ConvService as AIConversationService
    participant Repository as InterviewSessionRepository
    participant OpenAI as OpenAIService
    participant Cache as AICacheService
    
    Client->>Controller: POST /api/ai-agent/sessions
    Controller->>Controller: validateInput(dto)
    Controller->>UseCase: execute(input)
    
    UseCase->>UseCase: validateInput(input)
    UseCase->>RateLimit: checkRateLimit(userId)
    RateLimit-->>UseCase: void
    
    UseCase->>ConvService: initializeSession(context)
    ConvService->>ConvService: buildPrompt(context)
    ConvService->>OpenAI: generateResponse(welcomePrompt)
    OpenAI-->>ConvService: AIResponse
    ConvService->>ConvService: parseAIResponse(response)
    ConvService-->>UseCase: ConversationSession
    
    UseCase->>UseCase: createSession(input, welcomeMessage)
    UseCase->>Repository: save(session)
    Repository-->>UseCase: InterviewSession
    
    UseCase->>Cache: cacheConversation(sessionId, conversation)
    Cache-->>UseCase: void
    
    UseCase-->>Controller: StartSessionOutput
    Controller-->>Client: SessionResponseDto
```

### 2. メッセージ処理フロー

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AIAgentController
    participant UseCase as ProcessUserMessageUseCase
    participant RateLimit as AIRateLimitService
    participant Repository as InterviewSessionRepository
    participant ConvService as AIConversationService
    participant AnalysisService as ProcessAnalysisService
    participant OpenAI as OpenAIService
    participant Monitoring as AIMonitoringService
    participant Cache as AICacheService
    
    Client->>Controller: POST /api/ai-agent/sessions/{id}/messages
    Controller->>Controller: validateInput(dto)
    Controller->>UseCase: execute(input)
    
    UseCase->>UseCase: validateInput(input)
    UseCase->>RateLimit: checkRateLimit(userId)
    RateLimit-->>UseCase: void
    
    UseCase->>Repository: findById(sessionId)
    Repository-->>UseCase: InterviewSession
    UseCase->>UseCase: validateSession(session)
    
    UseCase->>ConvService: processMessage(session, message)
    ConvService->>ConvService: buildPrompt(context, conversation, message)
    ConvService->>OpenAI: generateResponse(prompt)
    OpenAI-->>ConvService: AIResponse
    ConvService->>ConvService: parseAIResponse(response)
    ConvService->>ConvService: generateFollowUpQuestions(conversation)
    ConvService-->>UseCase: AIResponse
    
    UseCase->>AnalysisService: extractRequirements(conversation)
    AnalysisService->>AnalysisService: extractEntities(text)
    AnalysisService->>AnalysisService: classifyIntent(message)
    AnalysisService->>OpenAI: generateResponse(analysisPrompt)
    OpenAI-->>AnalysisService: AIResponse
    AnalysisService->>AnalysisService: parseRequirements(response)
    AnalysisService-->>UseCase: ProcessRequirement[]
    
    UseCase->>UseCase: updateSession(session, message, response, requirements)
    UseCase->>Repository: updateConversation(sessionId, conversation)
    Repository-->>UseCase: void
    UseCase->>Repository: updateRequirements(sessionId, requirements)
    Repository-->>UseCase: void
    
    UseCase->>Cache: cacheConversation(sessionId, conversation)
    Cache-->>UseCase: void
    
    UseCase->>Monitoring: logUsage(userId, tokens, cost)
    Monitoring-->>UseCase: void
    
    UseCase-->>Controller: ProcessMessageOutput
    Controller-->>Client: MessageResponseDto
```

### 3. テンプレート生成フロー

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AIAgentController
    participant UseCase as GenerateTemplateRecommendationsUseCase
    participant Repository as InterviewSessionRepository
    participant AnalysisService as ProcessAnalysisService
    participant TemplateService as TemplateRecommendationService
    participant KnowledgeRepo as ProcessKnowledgeRepository
    participant ResearchService as WebResearchService
    participant OpenAI as OpenAIService
    participant Cache as AICacheService
    participant Queue as BackgroundJobQueue
    
    Client->>Controller: POST /api/ai-agent/sessions/{id}/generate-template
    Controller->>Controller: validateInput(dto)
    Controller->>UseCase: execute(input)
    
    UseCase->>UseCase: validateInput(input)
    UseCase->>Repository: findById(sessionId)
    Repository-->>UseCase: InterviewSession
    UseCase->>UseCase: validateSession(session)
    
    UseCase->>AnalysisService: analyzeRequirements(requirements)
    AnalysisService->>AnalysisService: identifyStakeholders(requirements)
    AnalysisService->>AnalysisService: identifyDeliverables(requirements)
    AnalysisService->>AnalysisService: identifyConstraints(requirements)
    AnalysisService->>AnalysisService: estimateComplexity(requirements)
    AnalysisService->>AnalysisService: categorizeProcess(requirements)
    AnalysisService-->>UseCase: ProcessAnalysis
    
    UseCase->>KnowledgeRepo: findBestPractices(industry, processType)
    KnowledgeRepo-->>UseCase: KnowledgeBaseResult[]
    
    par Web Research (Async)
        UseCase->>Queue: enqueue(webResearchJob)
        Queue->>ResearchService: performWebResearch(analysis)
        ResearchService->>ResearchService: searchBestPractices(industry, processType)
        ResearchService->>ResearchService: validateSources(results)
        ResearchService->>ResearchService: extractActionableInsights(results)
        ResearchService-->>Queue: ResearchResult[]
    end
    
    UseCase->>TemplateService: generateRecommendations(analysis, knowledge, research)
    TemplateService->>TemplateService: buildTemplatePrompt(analysis, knowledge)
    TemplateService->>OpenAI: generateResponse(templatePrompt)
    OpenAI-->>TemplateService: AIResponse
    TemplateService->>TemplateService: parseTemplateResponse(response)
    TemplateService->>TemplateService: validateStepDependencies(steps)
    TemplateService->>TemplateService: detectCircularDependencies(steps)
    TemplateService->>TemplateService: optimizeStepSequence(steps)
    TemplateService->>TemplateService: calculateConfidenceScores(recommendations)
    TemplateService->>TemplateService: generateAlternatives(primary)
    TemplateService-->>UseCase: TemplateRecommendation[]
    
    UseCase->>UseCase: validateRecommendations(recommendations)
    UseCase->>Repository: updateGeneratedTemplate(sessionId, recommendations)
    Repository-->>UseCase: void
    
    UseCase->>Cache: cacheTemplateRecommendation(requirementsHash, template)
    Cache-->>UseCase: void
    
    UseCase-->>Controller: GenerateTemplateOutput
    Controller-->>Client: TemplateRecommendationDto
```

### 4. Web検索フロー

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AIAgentController
    participant UseCase as SearchBestPracticesUseCase
    participant ResearchService as WebResearchService
    participant CacheRepo as WebResearchCacheRepository
    participant WebSearch as WebSearchService
    participant Validation as InformationValidationService
    
    Client->>Controller: GET /api/ai-agent/research/best-practices
    Controller->>Controller: validateQuery(query)
    Controller->>UseCase: execute(query)
    
    UseCase->>UseCase: validateInput(query)
    UseCase->>ResearchService: searchBestPractices(industry, processType)
    
    ResearchService->>ResearchService: buildSearchQuery(parameters)
    ResearchService->>ResearchService: checkCache(queryHash)
    
    alt Cache Hit
        ResearchService->>CacheRepo: findByQueryHash(queryHash)
        CacheRepo-->>ResearchService: ResearchResult[]
    else Cache Miss
        ResearchService->>WebSearch: search(query, parameters)
        WebSearch-->>ResearchService: RawSearchResult[]
        ResearchService->>ResearchService: filterResults(results)
        ResearchService->>ResearchService: calculateRelevanceScore(result, query)
        ResearchService->>Validation: validateSources(results)
        Validation-->>ResearchService: SourceReliability[]
        ResearchService->>ResearchService: extractKeyInsights(content)
        ResearchService->>CacheRepo: saveToCache(queryHash, results)
        CacheRepo-->>ResearchService: void
    end
    
    ResearchService->>ResearchService: extractActionableInsights(results)
    ResearchService->>ResearchService: crossReferenceInformation(results)
    ResearchService-->>UseCase: ResearchResult[]
    
    UseCase-->>Controller: ResearchResultsDto
    Controller-->>Client: ResearchResultsDto
```

### 5. エラーハンドリングフロー

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AIAgentController
    participant UseCase as ProcessUserMessageUseCase
    participant OpenAI as OpenAIService
    participant Monitoring as AIMonitoringService
    participant ExceptionFilter as AIExceptionFilter
    
    Note over ExceptionFilter: GlobalExceptionFilterを継承<br/>ロガー名を'AIExceptionFilter'に変更
    
    Client->>Controller: POST /api/ai-agent/sessions/{id}/messages
    Controller->>UseCase: execute(input)
    
    UseCase->>OpenAI: generateResponse(prompt)
    OpenAI-->>UseCase: APIError (Rate Limit Exceeded)
    
    UseCase->>UseCase: handleOpenAIError(error)
    UseCase->>Monitoring: logAIError(userId, action, error)
    Monitoring-->>UseCase: void
    
    alt Retryable Error
        UseCase->>UseCase: waitForRetry(backoffTime)
        UseCase->>OpenAI: generateResponse(prompt)
        OpenAI-->>UseCase: AIResponse
    else Non-Retryable Error
        UseCase->>UseCase: createFallbackResponse()
        UseCase-->>Controller: DomainError
    end
    
    Controller-->>ExceptionFilter: DomainError
    ExceptionFilter->>ExceptionFilter: mapToHttpStatus(error)
    ExceptionFilter->>ExceptionFilter: sanitizeErrorMessage(error)
    ExceptionFilter->>ExceptionFilter: logError(error, context)
    ExceptionFilter-->>Client: ErrorResponseDto
```

## メソッド呼び出し詳細

### StartInterviewSessionUseCase.execute()
1. **validateInput()** - 入力データ検証
2. **checkRateLimit()** - レート制限チェック（AIRateLimitService使用）
3. **initializeSession()** - セッション初期化
4. **createSession()** - セッションエンティティ作成
5. **save()** - データベース保存
6. **cacheConversation()** - キャッシュ保存

※ AIRateLimitGuardはパススルー実装のため、実際のレート制限はUseCase層で実施

### ProcessUserMessageUseCase.execute()
1. **validateInput()** - 入力データ検証
2. **checkRateLimit()** - レート制限チェック（AIRateLimitService使用）
3. **findById()** - セッション取得
4. **processMessage()** - AI応答生成
5. **extractRequirements()** - 要件抽出
6. **updateSession()** - セッション更新
7. **updateConversation()** - 会話履歴更新
8. **logUsage()** - 利用統計記録

※ AIRateLimitGuardはパススルー実装のため、実際のレート制限はUseCase層で実施

### GenerateTemplateRecommendationsUseCase.execute()
1. **validateInput()** - 入力データ検証
2. **findById()** - セッション取得
3. **analyzeRequirements()** - 要件分析
4. **findBestPractices()** - 知識ベース検索
5. **performWebResearch()** - Web検索（非同期）
6. **generateRecommendations()** - テンプレート生成
7. **validateRecommendations()** - 推奨内容検証
8. **updateGeneratedTemplate()** - 生成結果保存

## 非同期処理フロー

### バックグラウンドジョブ処理
```mermaid
sequenceDiagram
    participant UseCase
    participant Queue as BackgroundJobQueue
    participant Processor as AIProcessingProcessor
    participant WebSearch as WebSearchService
    participant Socket as SocketGateway
    participant Client
    
    UseCase->>Queue: enqueue(webResearchJob)
    Queue-->>UseCase: jobId
    
    Queue->>Processor: handleWebResearch(job)
    Processor->>WebSearch: searchBestPractices(query)
    WebSearch-->>Processor: ResearchResult[]
    
    Processor->>Socket: notifyResearchComplete(sessionId, results)
    Socket->>Client: research_complete event
    
    alt Job Success
        Processor-->>Queue: job completed
    else Job Failure
        Processor->>Processor: logError(error)
        Processor-->>Queue: job failed (retry)
    end
```

### 7. WebSocket接続・認証フロー

```mermaid
sequenceDiagram
    participant Client as Socket.IO Client
    participant Gateway as SocketGateway
    participant Guard as SocketAuthGuard
    participant JWT as JwtService
    participant Config as ConfigService
    
    Client->>Gateway: connect(/ai-agent)
    Gateway->>Gateway: handleConnection(client)
    
    Gateway->>Guard: canActivate(context)
    Guard->>Guard: extractToken(client)
    
    alt Token from auth object
        Guard->>Guard: client.handshake.auth.token
    else Token from query
        Guard->>Guard: client.handshake.query.token  
    else Token from headers
        Guard->>Guard: client.handshake.headers.authorization
    end
    
    Guard->>Config: get('JWT_SECRET')
    Config-->>Guard: secret
    
    Guard->>JWT: verifyAsync(token, {secret})
    
    alt Token Valid
        JWT-->>Guard: payload
        Guard->>Guard: client.data.userId = payload.sub
        Guard->>Guard: client.data.email = payload.email
        Guard->>Guard: client.data.roles = payload.roles
        Guard-->>Gateway: true
        
        Gateway->>Gateway: extractUserId(client)
        Gateway->>Gateway: socketToUser.set(client.id, userId)
        Gateway->>Gateway: userSockets.add(userId, client.id)
        Gateway->>Client: emit('connected', {socketId, userId, timestamp})
    else Token Invalid
        JWT-->>Guard: Error
        Guard-->>Gateway: false (WsException)
        Gateway->>Client: disconnect()
    end
```

### 8. WebSocketセッション参加フロー

```mermaid
sequenceDiagram
    participant Client as Socket.IO Client
    participant Gateway as SocketGateway
    participant UseCase as GetInterviewSessionUseCase
    participant Repository as InterviewSessionRepository
    
    Client->>Gateway: emit('join-session', {sessionId})
    Gateway->>Gateway: handleJoinSession(data, client)
    
    Gateway->>Gateway: socketToUser.get(client.id)
    Gateway->>Gateway: userId = extractUserId(client)
    
    alt User not authenticated
        Gateway->>Client: emit('error', {message: 'Unauthorized'})
    else User authenticated
        Gateway->>Gateway: sessionRooms.get(sessionId)
        
        alt Session room not exists
            Gateway->>Gateway: sessionRooms.set(sessionId, {sessionId, userId, sockets})
        end
        
        Gateway->>Gateway: room.userId === userId?
        
        alt User owns session
            Gateway->>Gateway: room.sockets.add(client.id)
            Gateway->>Gateway: client.join(`session:${sessionId}`)
            Gateway->>Client: emit('session-joined', {sessionId, timestamp})
        else User doesn't own session
            Gateway->>Client: emit('error', {message: 'Unauthorized session access'})
        end
    end
```

### 9. タイピングインジケーターフロー

```mermaid
sequenceDiagram
    participant ClientA as Client A
    participant Gateway as SocketGateway
    participant Room as Session Room
    participant ClientB as Client B
    
    ClientA->>Gateway: emit('ai:message:typing:indicator', WsTypingIndicatorDto)
    Gateway->>Gateway: handleTypingIndicator(data, client)
    
    Gateway->>Gateway: socketToUser.get(client.id)
    
    alt User not authenticated
        Gateway->>ClientA: emit('error', {message: 'Unauthorized'})
    else User authenticated
        Gateway->>Gateway: sessionRooms.get(data.sessionId)
        
        alt Session exists and user owns it
            Gateway->>Room: client.to(`session:${sessionId}`)
            Room->>ClientB: emit('ai:message:typing', {
            Note right of ClientB: sessionId,<br/>isTyping,<br/>estimatedTime,<br/>stage,<br/>timestamp
            Room->>ClientB: })
        else Session not exists or user doesn't own
            Gateway->>ClientA: emit('error', {message: 'Unauthorized session access'})
        end
    end
```

### 10. セッションステータス要求フロー

```mermaid
sequenceDiagram
    participant Client as Socket.IO Client
    participant Gateway as SocketGateway
    participant UseCase as GetInterviewSessionUseCase
    participant Repository as InterviewSessionRepository
    participant Exception as DomainException
    
    Client->>Gateway: emit('ai:session:status:request', {sessionId})
    Gateway->>Gateway: handleStatusRequest(data, client)
    
    Gateway->>Gateway: socketToUser.get(client.id)
    
    alt User not authenticated
        Gateway->>Client: emit('error', {code: 'UNKNOWN_ERROR', message: 'Unauthorized'})
    else User authenticated
        Gateway->>UseCase: execute({sessionId, userId})
        
        alt Session found
            UseCase->>Repository: findById(sessionId)
            Repository-->>UseCase: InterviewSession
            UseCase-->>Gateway: SessionResponseDto
            
            Gateway->>Gateway: mapToWsSessionStatusDto(response)
            Gateway->>Client: emit('ai:session:status', WsSessionStatusDto)
        else DomainException thrown
            UseCase->>Exception: new DomainException('Session not found', 'SESSION_NOT_FOUND')
            Exception-->>Gateway: DomainException
            
            Gateway->>Client: emit('error', {
            Note right of Client: code: 'SESSION_NOT_FOUND',<br/>message: 'Session not found',<br/>details: {sessionId}
            Gateway->>Client: })
        else General error
            UseCase-->>Gateway: Error
            Gateway->>Client: emit('error', {code: 'UNKNOWN_ERROR', message})
        end
    end
```

### 11. AI処理進捗通知フロー

```mermaid
sequenceDiagram
    participant UseCase as GenerateTemplateUseCase
    participant Service as TemplateRecommendationService
    participant Gateway as SocketGateway
    participant Room as Session Room
    participant Client as Socket.IO Client
    
    UseCase->>Service: generateTemplate(requirements, analysis)
    
    Service->>Gateway: broadcastProgress(sessionId, 10, 'Analyzing requirements')
    Gateway->>Gateway: sendToSession(sessionId, notification)
    Gateway->>Room: server.to(`session:${sessionId}`)
    Room->>Client: emit('ai-notification', {
    Note right of Client: type: 'progress',<br/>sessionId,<br/>data: {progress: 10, message},<br/>timestamp
    Room->>Client: })
    
    Service->>Service: analyzeRequirements()
    
    Service->>Gateway: broadcastProgress(sessionId, 40, 'Researching best practices')
    Gateway->>Room: server.to(`session:${sessionId}`)
    Room->>Client: emit('ai-notification', {type: 'progress', ...})
    
    Service->>Service: researchBestPractices()
    
    Service->>Gateway: broadcastProgress(sessionId, 70, 'Generating template')
    Gateway->>Room: server.to(`session:${sessionId}`)
    Room->>Client: emit('ai-notification', {type: 'progress', ...})
    
    Service->>Service: generateTemplateSteps()
    
    Service->>Gateway: broadcastTemplateGenerated(sessionId, template)
    Gateway->>Room: server.to(`session:${sessionId}`)
    Room->>Client: emit('ai-notification', {
    Note right of Client: type: 'template',<br/>sessionId,<br/>data: template,<br/>timestamp
    Room->>Client: })
    
    Service-->>UseCase: TemplateRecommendation
```

---

**本シーケンス図は実装チームが参照する詳細設計図です。次のステップでクラス図へのフィードバックを行い、設計の整合性を確保します。**
