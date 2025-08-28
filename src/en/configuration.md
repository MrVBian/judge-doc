# Configurations

## Command Line Arguments

### Server

- The default binding address for the go judge is `localhost:5050`. Can be specified with `-http-addr` flag.
- By default gRPC endpoint is disabled, to enable gRPC endpoint, add `-enable-grpc` flag.
- The default binding address for the gRPC go judge is `localhost:5051`. Can be specified with `-grpc-addr` flag.
- The default log level is info, use `-silent` to disable logs or use `-release` to enable release logger (auto turn on if in docker).
- `-auth-token` to add token-based authentication to REST / gRPC
- By default, the GO debug endpoints (`localhost:5052/debug`) are disabled, to enable, specifies `-enable-debug`, and it also enables debug log
- By default, the prometheus metrics endpoints (`localhost:5052/metrics`) are disabled, to enable, specifies `-enable-metrics`
- Monitoring HTTP endpoint is enabled if metrics / debug is enabled, the default addr is `localhost:5052` and can be specified by `-monitor-addr`

### Sandbox

- The default concurrency equal to number of CPU, Can be specified with `-parallelism` flag.
- The default file store is in memory, local cache can be specified with `-dir` flag.
- The default CGroup prefix is `gojudge`, Can be specified with `-cgroup-prefix` flag.
- `-src-prefix` to restrict `src` copyIn path split by comma (need to be absolute path) (example: `/bin,/usr`)
- `-time-limit-checker-interval` specifies time limit checker interval (default 100ms) (valid value: \[1ms, 1s\])
- `-output-limit` specifies size limit of POSIX rlimit of output (default 256MiB)
- `-extra-memory-limit` specifies the additional memory limit to check memory limit exceeded (default 16KiB)
- `-copy-out-limit` specifies the default file copy out max (default 64MiB)
- `-open-file-limit` specifies the max number of open files (default 256)
- `-cpuset` specifies `cpuset.cpus` cgroup for each container (Linux only)
- `-container-cred-start` specifies container `setuid` / `setgid` credential start point (default: 0 (disabled)) (Linux only)
  - for example, by default container 0 will run with 10001 uid & gid and container 1 will run with 10002 uid & gid...
- `-enable-cpu-rate` enabled `cpu` cgroup to control cpu rate using cfs_quota & cfs_period control (Linux only)
  - `-cpu-cfs-period` specifies cfs_period if cpu rate is enabled (default 100ms) (valid value: \[1ms, 1s\])
- `-seccomp-conf` specifies `seccomp` filter setting to load when running program (need build tag `seccomp`) (Linux only)
  - for example, by `strace -c prog` to get all `syscall` needed and restrict to that sub set
  - however, the `syscall` count in one platform(e.g. x86_64) is not suitable for all platform, so this option is not recommended
  - the program killed by seccomp filter will have status `Dangerous Syscall`
- `-pre-fork` specifies number of container to create when server starts
- `-tmp-fs-param` specifies the tmpfs parameter for `/w` and `/tmp` when using default mounting (Linux only)
- `-file-timeout` specifies maximum TTL for file created in file store （e.g. `30m`)
- `-mount-conf` specifies detailed mount configuration, please refer `mount.yaml` as a reference (Linux only)
- `-container-init-path` specifies path to `cinit` (do not use, debug only) (Linux only)
- `-no-fallback` exit the program if creating cgroup failed and trying to fallback to rlimit / rusage mode (Linux only)

## Environment Variables

Environment variable will be override by command line arguments if they both present and all command line arguments have its correspond environment variable (e.g. `ES_HTTP_ADDR`). Run `go-judge --help` to see all the environment variable configurations.
