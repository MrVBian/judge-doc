# API

## REST API 接口

沙箱服务提供 REST API 接口来在受限制的环境中运行程序（默认监听于 `localhost:5050`）。

- **/run POST 在受限制的环境中运行程序（下面有例子）**
- /file GET 得到所有在文件存储中的文件 ID 到原始命名映射
- /file POST 上传一个文件到文件存储，返回一个文件 ID 用于提供给 /run 接口
- /file/:fileId GET 下载文件 ID 指定的文件
- /file/:fileId DELETE 删除文件 ID 指定的文件
- /ws /run 接口的 WebSocket 版
- /stream 运行交互式命令
- /version 得到本程序编译版本和 go 语言运行时版本
- /config 得到本程序部分运行参数，包括沙箱详细参数

## REST API 接口定义

```typescript
type run = (request: Request) => []Result;

interface Cmd {
    args: string[]; // 程序命令行参数
    env?: string[]; // 程序环境变量

    // 指定 标准输入、标准输出和标准错误的文件 (null 是为了 pipe 的使用情况准备的，而且必须被 pipeMapping 的 in / out 指定)
    files?: (LocalFile | MemoryFile | PreparedFile | Collector | StreamIn | StreamOut | null)[];
    tty?: boolean; // 开启 TTY （需要保证标准输出和标准错误为同一文件）同时需要指定 TERM 环境变量 （例如 TERM=xterm）

    // 资源限制
    cpuLimit?: number;     // CPU时间限制，单位纳秒
    clockLimit?: number;   // 等待时间限制，单位纳秒 （通常为 cpuLimit 两倍）
    memoryLimit?: number;  // 内存限制，单位 byte
    stackLimit?: number;   // 栈内存限制，单位 byte
    procLimit?: number;    // 线程数量限制
    cpuRateLimit?: number; // 仅 Linux，CPU 使用率限制，1000 等于单核 100%
    cpuSetLimit?: string;  // 仅 Linux，限制 CPU 使用，使用方式和 cpuset cgroup 相同 （例如，`0` 表示限制仅使用第一个核）
    strictMemoryLimit?: boolean; // deprecated: 使用 dataSegmentLimit （这个选项依然有效）
    dataSegmentLimit?: boolean; // 仅linux，开启 rlimit 堆空间限制（如果不使用cgroup默认开启）
    addressSpaceLimit?: boolean; // 仅linux，开启 rlimit 虚拟内存空间限制（非常严格，在所以申请时触发限制）

    // 在执行程序之前复制进容器的文件列表
    copyIn?: {[dst:string]:LocalFile | MemoryFile | PreparedFile | Symlink};

    // 在执行程序后从容器文件系统中复制出来的文件列表
    // 在文件名之后加入 '?' 来使文件变为可选，可选文件不存在的情况不会触发 FileError
    copyOut?: string[];
    // 和 copyOut 相同，不过文件不返回内容，而是返回一个对应文件 ID ，内容可以通过 /file/:fileId 接口下载
    copyOutCached?: string[];
    // 指定 copyOut 复制文件大小限制，单位 byte
    copyOutMax?: number;
}

interface Result {
    status: Status;
    error?: string; // 详细错误信息
    exitStatus: number; // 程序返回值
    time: number;   // 程序运行 CPU 时间，单位纳秒
    memory: number; // 程序运行内存，单位 byte
    procPeak?: number; // 程序运行最大线程数量（需要内核版本>=6.1，且开启 cgroup v2）
    runTime: number; // 程序运行现实时间，单位纳秒
    // copyOut 和 pipeCollector 指定的文件内容
    files?: {[name:string]:string};
    // copyFileCached 指定的文件 id
    fileIds?: {[name:string]:string};
    // 文件错误详细信息
    fileError?: FileError[];
}

enum Status {
    Accepted = 'Accepted', // 正常情况
    MemoryLimitExceeded = 'Memory Limit Exceeded', // 内存超限
    TimeLimitExceeded = 'Time Limit Exceeded', // 时间超限
    OutputLimitExceeded = 'Output Limit Exceeded', // 输出超限
    FileError = 'File Error', // 文件错误
    NonzeroExitStatus = 'Nonzero Exit Status', // 非 0 退出值
    Signalled = 'Signalled', // 进程被信号终止
    InternalError = 'Internal Error', // 内部错误
}

interface Request {
    requestId?: string; // 给 WebSocket 使用来区分返回值的来源请求
    cmd: Cmd[];
    pipeMapping: PipeMap[];
}

interface LocalFile {
    src: string; // 文件绝对路径
}

interface MemoryFile {
    content: string | Buffer; // 文件内容
}

interface PreparedFile {
    fileId: string; // 文件 id
}

interface Collector {
    name: string; // copyOut 文件名
    max: number;  // 最大大小限制
    pipe?: boolean; // 通过管道收集（默认值为false文件收集）
}

interface Symlink {
    symlink: string; // 符号连接目标 (v1.6.0+)
}

interface StreamIn {
    streamIn: boolean; // 流式输入 (v1.8.1+)
}

interface StreamOut {
    streamOut: boolean; // 流式输出 (v1.8.1+)
}


interface PipeIndex {
    index: number; // cmd 的下标
    fd: number;    // cmd 的 fd
}

interface PipeMap {
    in: PipeIndex;  // 管道的输入端
    out: PipeIndex; // 管道的输出端
    // 开启管道代理，传输内容会从输出端复制到输入端
    // 输入端内容在输出端关闭以后会丢弃 （防止 SIGPIPE ）
    proxy?: boolean; 
    name?: string;   // 如果代理开启，内容会作为 copyOut 放在输入端 （用来 debug ）
    // 限制 copyOut 的最大大小，代理会在超出大小之后正常复制
    max?: number;    
}

enum FileErrorType {
    CopyInOpenFile = 'CopyInOpenFile',
    CopyInCreateFile = 'CopyInCreateFile',
    CopyInCopyContent = 'CopyInCopyContent',
    CopyOutOpen = 'CopyOutOpen',
    CopyOutNotRegularFile = 'CopyOutNotRegularFile',
    CopyOutSizeExceeded = 'CopyOutSizeExceeded',
    CopyOutCreateFile = 'CopyOutCreateFile',
    CopyOutCopyContent = 'CopyOutCopyContent',
    CollectSizeExceeded = 'CollectSizeExceeded',
}

interface FileError {
    name: string; // 错误文件名称
    type: FileErrorType; // 错误代码
    message?: string; // 错误信息
}

interface CancelRequest {
    cancelRequestId: string; // 取消某个正在进行中的请求
};

// WebSocket 请求
type WSRequest = Request | CancelRequest;

// WebSocket 结果
interface WSResult {
    requestId: string;
    results: Result[];
    error?: string;
}

// 流式请求 / 响应
interface Resize {
    index: number;
    fd: number;
    rows: number;
    cols: number;
    x: number;
    y: number;
}

interface Input {
    index: number;
    fd: number;
    content: Buffer;
}

interface Output {
    index: number;
    fd: number;
    content: Buffer;
}
```

## WebSocket 流接口

WebSocket 流接口是用于运行一个程序，同时和它的输入输出进行交互。所有的消息都应该使用 WebSocket 的 binary 格式来发送来避免兼容性问题。

```text
+--------+--------+---...
| 类型   | 载荷 ...
+--------|--------+---...
请求:
请求类型 = 
  1 - 运行请求 (载荷 = JSON 编码的请求体)
  2 - 设置终端窗口大小 (载荷 = JSON 编码的请求体)
  3 - 输入 (载荷 = 1 字节 (4 位的 命令下标 + 4 位的 文件描述符) + 输入内容)
  4 - 取消 (没有载荷)

响应:
响应类型 = 
  1 - 运行结果 (载荷 = JSON 编码的运行结果)
  2 - 输出 (载荷 = 1 字节 (4 位的 命令下标 + 4 位的 文件描述符) + 输入内容)
```

任何的不完整，或者不合法的消息会被认为是错误，并终止运行。

## Prometheus 监控接口

在启用 `-enable-metrics` 时，默认在 `localhost:5052` 提供基于 `prometheus` 的监控接口，提供沙箱服务的关键指标监控。监控的指标包括：

- 工作协程运行数量，工作队列长度，容器使用
- 运行结果的 CPU、内存使用
- 程序以及容器的 CPU、内存使用
- 缓存文件系统的使用

使用 [Prometheus](https://prometheus.io) 采集监控指标之后，标准监控大屏可以使用 [Grafana 模版](https://grafana.com/grafana/dashboards/23188-sandbox/) 下载使用。

## 客户端设计建议

尽管沙箱服务设计之初是无状态服务，但是缓存的引入使得服务具有了状态。为了避免缓存泄漏，客户端需要仔细的管理好缓存。

客户端 SDK 应当提供一个机制来创建一个代表当前任务的数据结构，可以称为 `context`、`arena`、`task` 等。它的行为类似于常规客户端，但会记录所有由 `run` 命令缓存的文件。该结构应具有清理功能，如 `clean`、`close`、`shutdown`、`destroy` 等，以安全删除与该结构相关的所有文件。此外，该结构还可以提供创建子结构的功能，由父结构跟踪，以确保每个文件都被正确跟踪。在这种情况下，当子结构完成其工作时，可以清理缓存以提前释放资源。

```mermaid
flowchart LR
id1([根]) --> id2[[缓存的编译文件]]
id1 --> id3([测试任务 1])
id3 --> id4[[缓存的测试输出]]
id1 --> id5([测试任务 2])
id5 --> id6[[缓存的测试输出]]
id1 --> id7([测试任务 x])
```
