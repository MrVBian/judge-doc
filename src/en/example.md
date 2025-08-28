# Examples

Please use PostMan or similar tools to send request to `http://localhost:5050/run`

## Single Execution

This example require `apt install g++` inside the container

### Compile Request

```json
{
    "cmd": [{
        "args": ["/usr/bin/g++", "a.cc", "-o", "a"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": ""
        }, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 104857600,
        "procLimit": 50,
        "copyIn": {
            "a.cc": {
                "content": "#include <iostream>\nusing namespace std;\nint main() {\nint a, b;\ncin >> a >> b;\ncout << a + b << endl;\n}"
            }
        },
        "copyOut": ["stdout", "stderr"],
        "copyOutCached": ["a.cc", "a"]
    }]
}
```

```json
[
    {
        "status": "Accepted",
        "exitStatus": 0,
        "time": 303225231,
        "memory": 32243712,
        "runTime": 524177700,
        "files": {
            "stderr": "",
            "stdout": ""
        },
        "fileIds": {
            "a": "5LWIZAA45JHX4Y4Z", // record binary file id for subsequent request
            "a.cc": "NOHPGGDTYQUFRSLJ"
        }
    }
]
```

### Execution Request

```json
{
    "cmd": [{
        "args": ["a"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": "1 1"
        }, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 104857600,
        "procLimit": 50,
        "copyIn": {
            "a": {
                "fileId": "5LWIZAA45JHX4Y4Z" // saved file id from previous request
            }
        }
    }]
}
```

```json
[
    {
        "status": "Accepted",
        "exitStatus": 0,
        "time": 1173000,
        "memory": 10637312,
        "runTime": 1100200,
        "files": {
            "stderr": "",
            "stdout": "2\n"
        }
    }
]
```

Please make sure to call `DELETE /file/:fileId` to delete the cached file to avoid cache leak.

## Multiple (interaction problem)

```json
{
    "cmd": [{
        "args": ["/bin/cat", "1"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": ""
        }, null, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 1000000000,
        "memoryLimit": 1048576,
        "procLimit": 50,
        "copyIn": {
            "1": { "content": "TEST 1" }
        },
        "copyOut": ["stderr"]
    },
    {
        "args": ["/bin/cat"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [null, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 1000000000,
        "memoryLimit": 1048576,
        "procLimit": 50,
        "copyOut": ["stdout", "stderr"]
    }],
    "pipeMapping": [{
        "in" : {"index": 0, "fd": 1 },
        "out" : {"index": 1, "fd" : 0 }
    }]
}
```

```json
[
    {
        "status": "Accepted",
        "exitStatus": 0,
        "time": 1545123,
        "memory": 253952,
        "runTime": 4148800,
        "files": {
            "stderr": ""
        },
        "fileIds": {}
    },
    {
        "status": "Accepted",
        "exitStatus": 0,
        "time": 1501463,
        "memory": 253952,
        "runTime": 5897700,
        "files": {
            "stderr": "",
            "stdout": "TEST 1"
        },
        "fileIds": {}
    }
]
```

## Compile On Windows (cygwin)

```json
{
    "cmd": [{
        "args": ["C:\\Cygwin\\bin\\g++", "a.cc", "-o", "a"],
        "env": ["PATH=C:\\Cygwin\\bin;"],
        "files": [{
            "content": ""
        }, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 104857600,
        "procLimit": 50,
        "copyIn": {
            "a.cc": {
                "content": "#include <iostream>\n#include <signal.h>\n#include <unistd.h>\nusing namespace std;\nint main() {\nint a, b;\ncin >> a >> b;\ncout << a + b << endl;\n}"
            }
        },
        "copyOutCached": ["a.exe"]
    }]
}
```

```json
[
    {
        "status": "Accepted",
        "exitStatus": 0,
        "time": 140625000,
        "memory": 36286464,
        "files": {
            "stderr": "",
            "stdout": ""
        },
        "fileIds": {
            "a.exe": "HLQH2OF4MXUUJBCB"
        }
    }
]
```

## Infinite loop with cpu rate control

```json
{
 "cmd": [{
  "args": ["/usr/bin/python3", "1.py"],
  "env": ["PATH=/usr/bin:/bin"],
  "files": [{"content": ""}, {"name": "stdout","max": 10240}, {"name": "stderr","max": 10240}],
  "cpuLimit": 3000000000,
  "clockLimit": 4000000000,
  "memoryLimit": 104857600,
  "procLimit": 50,
  "cpuRate": 0.1,
  "copyIn": {
    "1.py": {
      "content": "while True:\n    pass"
    }
  }}]
}
```

```json
[
    {
        "status": "Time Limit Exceeded",
        "exitStatus": 9,
        "time": 414803599,
        "memory": 3657728,
        "runTime": 4046054900,
        "files": {
            "stderr": "",
            "stdout": ""
        }
    }
]
```

### FFI

Require compilation of `go-judge-cinit` and `go-judge-ffi`

```javascript
var ffi = require('ffi-napi');

var go_judge = ffi.Library('./go-judge-ffi', {
    'Init': ['int', ['string']],
    'Exec': ['string', ['string']],
    'FileList': ['string', []],
    'FileAdd': ['string', ['string']],
    'FileGet': ['string', ['string']],
    'FileDelete': ['string', ['string']]
});

if (go_judge.Init(JSON.stringify({
    cinitPath: "/judge/go-judge-cinit",
    parallelism: 4,
}))) {
    console.log("Failed to init go judge");
}

const result = JSON.parse(go_judge.Exec(JSON.stringify({
    "cmd": [{
        "args": ["/bin/cat", "test.txt"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": ""
        }, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 104857600,
        "procLimit": 50,
        "copyIn": {
            "test.txt": {
                "content": "TEST"
            }
        }
    }]
})));
console.log(result);

// Async
go_judge.Exec.async(JSON.stringify({
    "cmd": [{
        "args": ["/bin/cat", "test.txt"],
        "env": ["PATH=/usr/bin:/bin"],
        "files": [{
            "content": ""
        }, {
            "name": "stdout",
            "max": 10240
        }, {
            "name": "stderr",
            "max": 10240
        }],
        "cpuLimit": 10000000000,
        "memoryLimit": 104857600,
        "procLimit": 50,
        "copyIn": {
            "test.txt": {
                "content": "TEST"
            }
        }
    }]
}), (err, res) => {
    if (err) throw err;
    console.log(JSON.parse(res));
});

const fileAdd = (param) => new Promise((resolve, reject) => {
    go_judge.FileAdd.async(JSON.stringify(param), (err, res) => {
        if (err != null) { reject(err); } else { resolve(res); }
    });
});
const fileList = () => new Promise((resolve, reject) => {
    go_judge.FileList.async((err, res) => {
        if (err != null && res == null) { reject(err); } else { resolve(JSON.parse(res)); }
    });
});
const fileGet = (param) => new Promise((resolve, reject) => {
    go_judge.FileGet.async(JSON.stringify(param), (err, res) => {
        if (err != null && res == null) { reject(err); } else { resolve(res); }
    });
});
const fileDelete = (param) => new Promise((resolve, reject) => {
    go_judge.FileDelete.async(JSON.stringify(param), (err, res) => {
        if (err != null && res == null) { reject(err); } else { resolve(res); }
    });
});

const fileOps = async () => {
    const fileId = await fileAdd({ name: 'Name', content: 'Content' });
    console.log(fileId);
    const list = await fileList();
    console.log(list);
    const file = await fileGet({ id: fileId });
    console.log(file);
    const d = await fileDelete({ id: fileId });
    console.log(d);
    const e = await fileList();
    console.log(e);
};

fileOps();
```

Output:

```javascript
{
  requestId: '',
  results: [
    {
      status: 'Accepted',
      exitStatus: 0,
      time: 814048,
      memory: 253952,
      files: [Object]
    }
  ]
}
```
