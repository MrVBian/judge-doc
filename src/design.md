# 设计

## 运行要求

- Linux 内核版本 >= 3.10
- 系统 Cgroup 文件系统挂载于 `/sys/fs/cgroup` (Systemd 默认)

## 系统架构

```mermaid
block-beta
  columns 5
  a["传输层"]:5
  b["工作协程"]:5
  c["运行环境"]:3 d["文件存储"]:2
  e["Linux (go-sandbox)"] f["Windows (winc)"] g["macOS (app sandbox)"] h["共享内存"] i["磁盘"]
```

## 工作流

```mermaid
flowchart TB

s((开始)) --> copyIn

subgraph copyIn[copy in * n]
oh[打开宿主机文件] --> oc[打开容器文件]
oc --> cc[复制文件内容]
end

copyIn --> exe[在容器内运行资源受限的用户程序]
wait(等待用户程序结束，同时检查资源使用情况)
exe --> wait
wait --> copyOut

subgraph copyOut[copy out * n]
oho[打开宿主机文件] --> oco[打开容器文件]
oco --> cco[复制文件内容]
end

readStat(读取资源使用)
copyOut --> readStat
readStat --> e((结束))
```

## /run 接口返回状态

- Accepted: 程序在资源限制内正常退出
- Memory Limit Exceeded: 超出内存限制
- Time Limit Exceeded:
  - 超出 `timeLimit` 时间限制
  - 或者超过 `clockLimit` 等待时间限制
- Output Limit Exceeded:
  - 超出 `pipeCollector` 限制
  - 或者超出 `-output-limit` 最大输出限制
- File Error:
  - `copyIn` 指定文件不存在
  - 或者 `copyIn` 指定文件大小超出沙箱文件系统限制
  - 或者 `copyOut` 指定文件不存在
- Non Zero Exit Status: 程序用非 0 返回值退出
- Signalled: 程序收到结束信号而退出（例如 `SIGSEGV`）
- Dangerous Syscall: 程序被 `seccomp` 过滤器结束
- Internal Error:
  - 指定程序路径不存在
  - 或者容器创建失败
    - 比如使用非特权 docker
    - 或者在个人目录下以 root 权限运行
  - 或者其他错误

## 包

- envexec: 核心逻辑包，在提供的环境中运行一个或多个程序
- env: 环境的标准实现

## 注意

> [!WARNING]  
> Window 和 macOS 平台为实验性支持，请不要在生产环境使用

### 使用 cgroup

在 cgroup v1 系统上 `go-judge` 需要 `root` 权限创建 `cgroup`。请使用 `sudo` 以 `root` 用户运行或者确保运行用户拥有以下目录的读写权限 `/sys/fs/cgroup/cpuacct/gojudge`, `/sys/fs/cgroup/memory/gojudge`, `/sys/fs/cgroup/pids/gojudge`。

在 cgroup v2 系统上，`go-judge` 会和 `system dbus` 沟通，创建一个临时 `scope`。如果 `systemd` 不存在，并且拥有 `root` 权限那么将尝试进行嵌套初始化。

如果没有 `cgroup` 的权限，那么 `cgroup` 相关的资源配置将不会生效。

### cgroup v2

`go-judge` 目前已经支持 cgroup v2 鉴于越来越多的 Linux 发行版默认启用 cgroup v2 而不是 v1 （比如 Ubuntu 21.10+，Fedora 31+）。然而，对于内核版本小于 5.19 的版本，因为 cgroup v2 在内存控制器里面缺少 `memory.max_usage_in_bytes`，内存使用量计数会转而采用 `maxrss` 指标。这项指标会显示的比使用 cgroup v1 时候要稍多，在运行使用内存较少的程序时比较明显。对于内核版本大于或等于 5.19 的版本，`memory.peak` 会被采用。

同时，如果本程序在容器中运行，容器中的进程会被移到 `/api` cgroup v2 控制器中来开启 cgroup v2 嵌套支持。

在 `systemd` 为 `init` 的发行版中运行时，`go-judge` 会使用 `dbus` 通知 `systemd` 来创建一个临时 `scope` 作为 `cgroup` 的根。

在高于 5.7 的内核中运行时，`go-judge` 会尝试更快的 `clone3(CLONE_INTO_CGROUP)` 方法.

### 内存使用

控制进程通常会使用 `20M` 内存，每个容器进程最大会使用 `20M` 内存，每个请求最大会使用 `2 * 16M` + 总 copy out max 限制 * 2 内存。请注意，缓存文件会存储在宿主机的共享内存中 (`/dev/shm`)，请保证其大小足够存储运行时最大可能文件。

比方说当同时请求数最大为 4 的时候，本程序最大会占用 `60 + (20+32) * 4M = 268M` + 总 copy out max 限制 * 8 内存 + 总运行程序最大内存限制。

因为 go 语言 runtime 垃圾收集算法实现的问题，它并不会主动归还占用内存。这种情况可能会引发 OOM Killer 杀死进程。加入了一个后台检查线程用于在堆内存占用高时强制垃圾收集和归还内存。

- `-force-gc-target` 默认 `20m`, 堆内存使用超过该值是强制垃圾收集和归还内存
- `-force-gc-interval` 默认 `5s`, 为后台线程检查的频繁程度

## 压力测试

使用 `wrk` 和 `t.lua`: `wrk -s t.lua -c 1 -t 1 -d 30s --latency http://localhost:5050/run`.

注意，这些结果只是极限情况下的表现，实际情况和使用方式相关。通常沙箱服务相比于直接运行程序，通常有 1 毫秒左右额外延迟。

```lua
wrk.method = "POST"
wrk.body   = '{"cmd":[{"args":["/bin/cat","a.hs"],"env":["PATH=/usr/bin:/bin"],"files":[{"content":""},{"name":"stdout","max":10240},{"name":"stderr","max":10240}],"cpuLimit":10000000000,"memoryLimit":104857600,"procLimit":50,"copyIn":{"a.hs":{"content":"main = putStrLn \\"Hello, World!\\""},"b":{"content":"TEST"}}}]}'
wrk.headers["Content-Type"] = "application/json;charset=UTF-8"
```

- 单线程 ~800-860 op/s Windows 10 WSL2 @ 5800X
- 多线程 ~4500-6000 op/s Windows 10 WSL2 @ 5800X

单线程:

```text
Running 30s test @ http://localhost:5050/run
  1 threads and 1 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     1.16ms  132.89us   6.20ms   90.15%
    Req/Sec     0.87k    19.33     0.91k    85.33%
  Latency Distribution
     50%    1.13ms
     75%    1.18ms
     90%    1.27ms
     99%    1.61ms
  25956 requests in 30.01s, 6.88MB read
Requests/sec:    864.88
Transfer/sec:    234.68KB
```

## go-sandbox 容器协议

```mermaid
sequenceDiagram

box 主机
participant u as go-sandbox 容器 api
participant s as 容器环境
end

create participant c
s ->> c: 创建环境隔离容器

loop 容器服务循环
alt execve 请求

u ->> s: execve

s ->> c: execve 命令 <br/> argv, envv, fd, rlimits等
create participant e
c ->> e: fork & map fd & 限制特权 <br/> 内核 >= 5.7 w/ cgroup v2 时使用 <br/> clone3(CLONE_INTO_CGROUP)

opt 同步 cgroup (内核 < 5.7)
e ->> c: 初始化成功
activate e
note over e: 暂停等待 ack
c ->> s: 同步请求: pid
note over s: 同步: 往 cgroup 添加 pid
s ->> c: ack
c ->> e: 同步完成
deactivate e
note over e: 继续执行
end

note over e: execve

opt 同步 (内核 >= 5.7 w/ cgroup v2)
e ->> c: 初始化成功
c ->> s: 同步请求
note over s: 同步: 关闭 cgroup fd
s ->> c: ack
end

alt 正常结束
e ->> c: waitpid 返回
c ->> s: 运行结果
s ->> c: kill
c ->> e: kill all 
else 强制终止 (TLE, MLE, etc)
s ->> c: kill
c ->> e: kill all 
e ->> c: waitpid 返回
c ->> s: 运行结果
end

s ->> u: execve 运行结果

destroy e
e ->> c: 收集所有僵尸进程完成

else conf / ping / open / delete / reset 

u ->> s: 调用 api
s ->> c: 发送命令
c ->> s: 命令执行结果
s ->> u: 返回执行结果

end
end

box container
participant c as 容器 init 进程
participant e as 用户程序
end
```
