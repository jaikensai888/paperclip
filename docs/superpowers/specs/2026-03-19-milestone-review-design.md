# 里程碑审查功能设计文档

> 创建日期: 2026-03-19
> 状态: 待实现

## 1. 背景

Paperclip 现有的审批系统仅支持：
- `hire_agent` - 代理招聘审批
- `approve_ceo_strategy` - CEO 战略审批

用户需要在**构建目标时定义审查节点**，以便在关键里程碑处进行人工审查。

## 2. 需求总结

### 2.1 核心需求

1. **触发时机**：规划目标时定义审查节点（里程碑）
2. **粒度**：里程碑级别（特殊任务）
3. **触发方式**：任务完成时自动创建审批
4. **审查人**：可配置（代理或用户），单一审查人
5. **审查结果**：通过保持 `done`，拒绝回退到 `in_progress`
6. **实时沟通**：审查人可与代理即时对话，对话结束后生成精简总结

### 2.2 设计决策

| 决策点 | 选择 |
|--------|------|
| 审查触发 | 任务完成时自动创建审批 |
| 审查人选择 | 推荐 + 搜索，支持代理和用户 |
| 状态显示 | 颜色标签：待审查(黄)、已通过(绿)、已拒绝(红) |
| 审批列表 | 与现有审批混合，通过类型标签区分 |
| 审批详情 | 基本信息 + 完成汇报 + 对话总结 |
| 完成证据 | 代理完成任务时填写汇报 |
| 沟通方式 | 侧边抽屉实时聊天 |
| 消息格式 | 纯文本 |
| 对话记录 | 不保存完整记录，仅保留精简总结 |
| 总结生成 | 代理自动生成精简总结 |
| 通知方式 | 自动通知审查人 |

## 3. 数据模型

### 3.1 issues 表扩展

```typescript
// 新增字段
{
  isMilestone: boolean,           // 是否为里程碑
  reviewerAgentId: string | null, // 审查代理 ID
  reviewerUserId: string | null,  // 审查用户 ID
  reviewApprovalId: string | null, // 关联的审批 ID
  completionReport: string | null, // 完成汇报（代理填写）
  reviewSummary: string | null,   // 对话总结（代理生成，精简）
}
```

### 3.2 approvals 表扩展

```typescript
// APPROVAL_TYPES 新增
APPROVAL_TYPES = ["hire_agent", "approve_ceo_strategy", "review_milestone"]

// review_milestone 的 payload 结构
{
  milestoneId: string,        // 里程碑任务 ID
  milestoneTitle: string,     // 里程碑标题
  goalId: string,             // 关联目标 ID
  goalTitle: string,          // 目标标题
  completedByAgentId: string, // 完成代理 ID
  completionReport: string,   // 完成汇报
  reviewSummary: string | null, // 对话总结（对话后填充）
}
```

## 4. API 设计

### 4.1 里程碑 CRUD

```
# 创建里程碑（在目标详情页）
POST /api/companies/{companyId}/issues
{
  title: string,
  description?: string,
  isMilestone: true,
  reviewerAgentId?: string,
  reviewerUserId?: string,
  goalId: string,
  projectId?: string,
  assigneeAgentId: string,
  status: "todo" | "backlog"
}

# 获取目标的里程碑列表
GET /api/companies/{companyId}/issues?goalId={goalId}&isMilestone=true

# 更新里程碑
PATCH /api/issues/{issueId}
{
  reviewerAgentId?: string,
  reviewerUserId?: string,
  ...
}
```

### 4.2 完成汇报

```
# 里程碑完成时提交汇报
POST /api/issues/{issueId}/complete-milestone
{
  completionReport: string  // 完成汇报内容
}
```

### 4.3 代理聊天

```
# WebSocket 连接
WS /api/agents/{agentId}/chat

# 消息格式
{
  type: "message" | "typing" | "summary",
  content: string,
  timestamp: number
}

# 开始会话（唤醒代理）
POST /api/agents/{agentId}/chat/sessions
{
  contextType: "milestone_review",
  contextId: string,  // approval ID
  initialMessage: string
}

# 结束会话（生成总结）
POST /api/agents/{agentId}/chat/sessions/{sessionId}/end
-> 返回精简总结
```

## 5. UI 设计

### 5.1 目标详情页 - 里程碑 Tab

位置：`ui/src/pages/GoalDetail.tsx`

- 新增"里程碑"标签页，与"任务"、"文档"并列
- 显示该目标下所有里程碑
- 每个里程碑卡片显示：
  - 标题
  - 状态标签（待审查/已通过/已拒绝）
  - 审查人
  - 完成/预计日期
- 支持创建、编辑、删除里程碑

### 5.2 创建里程碑对话框

位置：`ui/src/components/NewMilestoneDialog.tsx`

表单字段：
- 标题（必填）
- 描述
- 负责代理（必填）
- 审查人（必填，支持搜索代理和用户）
- 预计完成日期

### 5.3 完成汇报对话框

位置：`ui/src/components/CompletionReportDialog.tsx`

- 里程碑任务点击"完成"时弹出
- 文本域：请填写完成汇报
- 提交后创建审批

### 5.4 审批详情页 - 里程碑类型

位置：`ui/src/components/ApprovalPayload.tsx`

显示内容：
- 里程碑信息（标题、关联目标、负责代理）
- 完成汇报
- 对话总结（如有）
- 操作按钮：与代理对话、通过、拒绝

### 5.5 代理聊天抽屉

位置：`ui/src/components/AgentChatDrawer.tsx`

- 从右侧滑出的抽屉面板
- 聊天消息列表（纯文本）
- 输入框 + 发送按钮
- "结束对话并生成总结"按钮
- 关闭时自动生成精简总结

## 6. 工作流程

### 6.1 规划阶段

```
目标详情页 → 里程碑 Tab → 点击"添加" → 填写表单 → 设置审查人 → 创建里程碑
```

### 6.2 执行阶段

```
代理签出里程碑任务 → 执行工作 → 点击"完成" → 填写完成汇报 → 提交
    ↓
系统自动创建 review_milestone 审批 → 通知审查人
```

### 6.3 审查阶段

```
审查人收到通知 → 进入审批详情页 → 查看完成汇报
    ↓
有疑问？→ 点击"与代理对话" → 打开聊天抽屉 → 代理唤醒 → 实时对话
    ↓
点击"结束对话" → 代理生成精简总结 → 保存到审批记录
    ↓
做出决定：
  - 通过 → 任务保持 done 状态
  - 拒绝 → 任务回退到 in_progress，代理根据意见重新执行
```

## 7. 文件变更清单

### 7.1 数据库层

| 文件 | 变更 |
|------|------|
| `packages/db/src/schema/issues.ts` | 添加 isMilestone, reviewerAgentId, reviewerUserId, reviewApprovalId, completionReport, reviewSummary |
| `packages/db/drizzle` | 新增迁移文件 |

### 7.2 共享层

| 文件 | 变更 |
|------|------|
| `packages/shared/src/constants.ts` | APPROVAL_TYPES 添加 "review_milestone" |
| `packages/shared/src/validators/issue.ts` | 添加里程碑相关字段验证 |
| `packages/shared/src/types/issue.ts` | 更新 Issue 接口 |

### 7.3 服务端

| 文件 | 变更 |
|------|------|
| `server/src/services/issues.ts` | 添加里程碑完成逻辑，创建审批 |
| `server/src/services/approvals.ts` | 添加 review_milestone 类型处理 |
| `server/src/services/agent-chat.ts` | **新建** - 代理实时聊天服务 |
| `server/src/routes/agent-chat.ts` | **新建** - 聊天 WebSocket/HTTP 路由 |
| `server/src/routes/issues.ts` | 添加里程碑完成端点 |

### 7.4 UI 层

| 文件 | 变更 |
|------|------|
| `ui/src/pages/GoalDetail.tsx` | 添加里程碑 Tab |
| `ui/src/components/MilestoneList.tsx` | **新建** - 里程碑列表组件 |
| `ui/src/components/NewMilestoneDialog.tsx` | **新建** - 创建里程碑对话框 |
| `ui/src/components/CompletionReportDialog.tsx` | **新建** - 完成汇报对话框 |
| `ui/src/components/AgentChatDrawer.tsx` | **新建** - 代理聊天侧边抽屉 |
| `ui/src/components/ApprovalPayload.tsx` | 添加 review_milestone 渲染器 |
| `ui/src/api/issues.ts` | 添加里程碑相关 API 调用 |
| `ui/src/api/chat.ts` | **新建** - 聊天 API |

## 8. 验证计划

### 8.1 单元测试

- 里程碑创建验证
- 完成汇报必填验证
- 审批自动创建逻辑
- 审批通过/拒绝状态转换

### 8.2 集成测试

- 完整里程碑生命周期测试
- 聊天会话测试
- 审批通知测试

### 8.3 手动测试

1. 创建目标 → 添加里程碑 → 设置审查人
2. 代理执行任务 → 完成并填写汇报
3. 审查人收到通知 → 查看审批详情
4. 与代理实时对话 → 结束对话生成总结
5. 通过审批 → 任务保持完成
6. 拒绝审批 → 任务回退，代理重新执行

## 9. 后续扩展

- 支持多人审查（任意通过/全部通过）
- 里程碑模板
- 审查 SLA 提醒
- 对话历史导出
