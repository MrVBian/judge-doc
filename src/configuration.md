# 配置

## 命令行参数

服务相关:

- 默认监听地址是 `localhost:5050`，使用 `-http-addr` 指定
- 默认 gRPC 接口处于关闭状态，使用 `-enable-grpc` 开启
- 默认 gRPC 监听地址是 `localhost:5051` ，使用 `-grpc-addr` 指定
- 默认日志等级是 info ，使用 `-silent` 关闭 或 使用 `-release` 开启 release 级别日志
- 默认没有开启鉴权，使用 `-auth-token` 指定令牌鉴权
- 默认没有开启 go 语言调试接口（`localhost:5052/debug`），使用 `-enable-debug` 开启，同时将日志层级设为 Debug
- 默认没有开启 prometheus 监控接口，使用 `-enable-metrics` 开启 `localhost:5052/metrics`
- 在启用 go 语言调试接口或者 prometheus 监控接口的情况下，默认监控接口为 `localhost:5052`，使用 `-monitor-addr` 指定

沙箱相关:

- 默认同时运行任务数为和 CPU 数量相同，使用 `-parallelism` 指定
- 默认文件存储在内存里，使用 `-dir` 指定本地目录为文件存储
- 默认 cgroup 的前缀为 `gojudge` ，使用 `-cgroup-prefix` 指定
- 默认没有磁盘文件复制限制，使用 `-src-prefix` 限制 copyIn 操作文件目录前缀，使用逗号 `,` 分隔（需要绝对路径）（例如：`/bin,/usr`）
- 默认时间和内存使用检查周期为 100 毫秒(`100ms`)，使用 `-time-limit-checker-interval` 指定
- 默认最大输出限制为 `256MiB`，使用 `-output-limit` 指定
- 默认最大打开文件描述符为 `256`，使用 `-open-file-limit` 指定
- 默认最大额外内存使用为 `16KiB` ，使用 `-extra-memory-limit` 指定
- 默认最大 `copyOut` 文件大小为 `64MiB` ，使用 `-copy-out-limit` 指定
- 使用 `-cpuset` 指定 `cpuset.cpus` （仅 Linux）
- 默认容器用户开始区间为 0（不启用） 使用 `-container-cred-start` 指定（仅 Linux）
  - 举例，默认情况下第 0 个容器使用 10001 作为容器用户。第 1 个容器使用 10002 作为容器用户，以此类推
- 使用 `-enable-cpu-rate` 开启 `cpu` cgroup 来启用 `cpuRate` 控制（仅 Linux）
  - 使用 `-cpu-cfs-period` 指定 cfs_period if cpu rate is enabled (default 100ms) (valid value: \[1ms, 1s\])
- 使用 `-seccomp-conf` 指定 `seecomp` 过滤器（需要编译标志 `seccomp`，默认不开启）（仅 Linux）
- 使用 `-pre-fork` 指定启动时创建的容器数量
- 使用 `-tmp-fs-param` 指定容器内 `tmpfs` 的挂载参数（仅 Linux）
- 使用 `-file-timeout` 指定文件存储文件最大时间。超出时间的文件将会删除。（举例 `30m`）
- 使用 `-mount-conf` 指定沙箱文件系统挂载细节，详细请参见 `mount.yaml` (仅 Linux)
- 使用 `-container-init-path` 指定 `cinit` 路径 (请不要使用，仅 debug) (仅 Linux)
- 使用 `-no-fallback` 在创建 `cgroup` 失败退出程序，而不是自动会退到 `rlimit` / `rusage` 模式 (仅 Linux)

## 环境变量

所有命令行参数都可以通过环境变量的形式来指定，（类似 `ES_HTTP_ADDR` 来指定 `-http-addr`）。使用 `go-judge --help` 查看所有环境变量
