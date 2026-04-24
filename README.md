# codex-cleanup

一个基于 Bun 的本地维护工具，用于检查并清理 `~/.codex` 下过期或不一致的本地状态。

仓库当前只暴露一个可安装的 CLI：`codex-cleanup`。它会读取线程与日志相关的本地 SQLite 状态，先报告差异，再在显式要求时执行清理。

## 为什么存在

当本地 Codex 状态和日志索引出现残留、错位或失配时，手工排查成本高且容易误删。这个仓库的职责是把检查和清理流程收敛成一个稳定、可重复执行的命令入口。

## 职责边界

本仓库负责：

- 检查与线程、日志相关的本地 Codex SQLite 状态
- 提供稳定的 dry-run 和 apply 清理入口
- 保持仓库级协作约束和执行入口清晰分离

本仓库不负责：

- 承担 `~/.codex` 之外的通用数据迁移或清理框架
- 接管 Codex 的长期配置管理或其他无关运维职责

## 先看哪里

- [src/bin/codex-cleanup.ts](/Users/morlay/src/github.com/morlay/codex-cleanup/src/bin/codex-cleanup.ts): CLI 主入口，适合先确认程序从哪里启动
- [justfile](/Users/morlay/src/github.com/morlay/codex-cleanup/justfile): 仓库稳定执行入口，包含 dry-run 和 apply 命令
- [AGENTS.md](/Users/morlay/src/github.com/morlay/codex-cleanup/AGENTS.md): 仓库级协作约束和高风险操作护栏

## 最小开始方式

先安装依赖并使用只读检查入口确认当前状态：

```bash
bun install
just dry-run
```

确认输出符合预期后，再按需执行：

```bash
just apply
just apply-verbose
```
