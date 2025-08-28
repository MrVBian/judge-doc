# API

## REST API

A REST service to run program in restricted environment (Listening on `localhost:5050` by default).

- **/run POST execute program in the restricted environment (examples below)**
- /file GET list all cached file id to original name map
- /file POST prepare a file in the go judge (in memory), returns fileId (can be referenced in /run parameter)
- /file/:fileId GET downloads file from go judge (in memory), returns file content
- /file/:fileId DELETE delete file specified by fileId
- /ws WebSocket for /run
- /stream WebSocket for stream run
- /version gets build git version (e.g. `v1.4.0`) together with runtime information (go version, os, platform)
- /config gets some configuration (e.g. `fileStorePath`, `runnerConfig`) together with some supported features

## REST API Interface

```typescript
type run = (request: Request) => []Result;

interface Cmd {
    args: string[]; // command line argument
    env?: string[]; // environment

    // specifies file input / pipe collector for program file descriptors (null is reserved for pipe mapping and must be filled by in / out)
    files?: (LocalFile | MemoryFile | PreparedFile | Collector | StreamIn | StreamOut ｜ null)[];
    tty?: boolean; // enables tty on the input and output pipes (should have just one input & one output)
    // Notice: must have TERM environment variables (e.g. TERM=xterm)

    // limitations
    cpuLimit?: number;     // ns
    realCpuLimit?: number; // deprecated: use clock limit instead (still working)
    clockLimit?: number;   // ns
    memoryLimit?: number;  // byte
    stackLimit?: number;   // byte (N/A on windows, macOS cannot set over 32M)
    procLimit?: number;
    cpuRateLimit?: number; // limit cpu usage (1000 equals 1 cpu)
    cpuSetLimit?: string; // Linux only: set the cpuSet for cgroup
    strictMemoryLimit?: boolean; // deprecated: use dataSegmentLimit instead (still working)
    dataSegmentLimit?: boolean; // Linux only: use (+ rlimit_data limit) enable by default if cgroup not enabled
    addressSpaceLimit?: boolean; // Linux only: use (+ rlimit_address_space limit) 

    // copy the correspond file to the container dst path
    copyIn?: {[dst:string]:LocalFile | MemoryFile | PreparedFile | Symlink};

    // copy out specifies files need to be copied out from the container after execution
    // append '?' after file name will make the file optional and do not cause FileError when missing
    copyOut?: string[];
    // similar to copyOut but stores file in go judge and returns fileId, later download through /file/:fileId
    copyOutCached?: string[];
    // specifies the directory to dump container /w content
    copyOutDir: string
    // specifies the max file size to copy out
    copyOutMax?: number; // byte
}

interface Result {
    status: Status;
    error?: string; // potential system error message
    exitStatus: number;
    time: number;   // ns (cgroup recorded time)
    memory: number; // byte
    runTime: number; // ns (wall clock time)
    procPeak?: number; // peak number of process (cgroup v2, kernel >= 6.1)
    // copyFile name -> content
    files?: {[name:string]:string};
    // copyFileCached name -> fileId
    fileIds?: {[name:string]:string};
    // fileError contains detailed file errors
    fileError?: FileError[];
}

enum Status {
    Accepted = 'Accepted', // normal
    MemoryLimitExceeded = 'Memory Limit Exceeded', // mle
    TimeLimitExceeded = 'Time Limit Exceeded', // tle
    OutputLimitExceeded = 'Output Limit Exceeded', // ole
    FileError = 'File Error', // fe
    NonzeroExitStatus = 'Nonzero Exit Status',
    Signalled = 'Signalled',
    InternalError = 'Internal Error', // system error
}

interface Request {
    requestId?: string; // for WebSocket requests
    cmd: Cmd[];
    pipeMapping?: PipeMap[];
}

interface LocalFile {
    src: string; // absolute path for the file
}

interface MemoryFile {
    content: string | Buffer; // file contents
}

interface PreparedFile {
    fileId: string; // fileId defines file uploaded by /file
}

interface Collector {
    name: string; // file name in copyOut
    max: number;  // maximum bytes to collect from pipe
    pipe?: boolean; // collect over pipe or not (default false)
}

interface Symlink {
    symlink: string; // symlink destination (v1.6.0+)
}

interface StreamIn {
    streamIn: boolean; // stream input (v1.8.1+)
}

interface StreamOut {
    streamOut: boolean; // stream output (v1.8.1+)
}

interface PipeIndex {
    index: number; // the index of cmd
    fd: number;    // the fd number of cmd
}

interface PipeMap {
    in: PipeIndex;  // input end of the pipe
    out: PipeIndex; // output end of the pipe
    // enable pipe proxy from in to out, 
    // content from in will be discarded if out closes
    proxy?: boolean; 
    name?: string;   // copy out proxy content if proxy enabled
    // limit the copy out content size, 
    // proxy will still functioning after max
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
    name: string; // error file name
    type: FileErrorType; // type
    message?: string; // detailed message
}

interface CancelRequest {
    cancelRequestId: string;
};

// WebSocket request
type WSRequest = Request | CancelRequest;

// WebSocket results
interface WSResult {
    requestId: string;
    results: Result[];
    error?: string;
}

// Stream request & responses
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

## WebSocket Stream Interface

Websocket stream interface is used to run command interactively with inputs and outputs pumping from the command. All message is transmitted in binary format for maximum compatibility.

```text
+--------+--------+---...
| type   | payload ...
+--------|--------+---...
request:
type = 
  1 - request (payload = JSON encoded request)
  2 - resize (payload = JSON encoded resize request)
  3 - input (payload = 1 byte (4-bit index + 4-bit fd), followed by content)
  4 - cancel (no payload)

response:
type = 
  1 - response (payload = JSON encoded response)
  2 - output (payload = 1 byte (4-bit index + 4-bit fd), followed by content)
```

Any incomplete / invalid message will be treated as error.

## Prometheus Monitor API

When monitor endpoint enabled by `-enable-metrics` command line argument, key metrics will be provided in `prometheus` format at `localhost:5052` by default. Including

- Worker goroutine count, worker queue length, container count
- CPU, Memory usage of execution result
- CPU, Memory usage of container and controller
- Usage of cache file system

After collecting metrics via [Prometheus](https://prometheus.io), you may utilize [this Grafana template](https://grafana.com/grafana/dashboards/23188-sandbox/) for dashboard monitoring.

## Client Implementation Suggestion

Although the sandbox is designed to be stateless, the existence of cached file make it stateful. Thus, the client library should take care the cache file to avoid leakage, which is bad since it will remain in the memory / swap.

The client library could provide a structure to group the requests like `context`, `arena`, `task`, etc., which behaves like regular client but records all the files cached by the `run` command. And the structure should have a clean-up function like `clean`, `close`, `shutdown`, `destroy`, etc. to safely delete all the files related to the structure. Also, the structure could provide functionality to create child structure that tracked by the parent structure to ensure every file is being tracked correctly. In this case, when child structure finishes its work, it can clean up the cache to release the resource earlier.

```mermaid
flowchart LR
id1([root]) --> id2[[cached compiled files]]
id1 --> id3([test case 1])
id3 --> id4[[cached test outputs]]
id1 --> id5([test case 2])
id5 --> id6[[cached test outputs]]
id1 --> id7([test case x])
```
