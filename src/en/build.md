# Build

## Build go judge

Build by your own `docker build -t go-judge -f Dockerfile.exec .`

For cgroup v1, the `go-judge` need root privilege to create `cgroup`. Either creates sub-directory `/sys/fs/cgroup/cpuacct/go_judge`, `/sys/fs/cgroup/memory/go_judge`, `/sys/fs/cgroup/pids/go_judge` and make execution user readable or use `sudo` to run it.

For cgroup v2, systemd dbus will be used to create a transient scope for cgroup integration.

## Build Shared object

Build container init `cinit`:

`go build -o cinit ./cmd/go-judge-init`

Build `go_judge.so`:

`go build -buildmode=c-shared -o go_judge.so ./cmd/go-judge-ffi/`

For example, in JavaScript, run with `ffi-napi` (seems node 14 is not supported yet):

## Build gRPC Proxy

Build `go build ./cmd/go-judge-proxy`

Run `./go-judge-proxy`, connect to gRPC endpoint expose as a REST endpoint.

## Build go judge Shell

Build `go build ./cmd/go-judge-shell`

Run `./go-judge-shell`, connect to gRPC endpoint with interactive shell.

## Build Docker

Create `Dockerfile` with the following content `go-judge` repository and run `docker build -t go-judge .`.

:::code-group

```dockerfile [golang]
FROM golang:latest AS build 

WORKDIR /go/judge

COPY go.mod go.sum /go/judge/

RUN go mod download -x

COPY ./ /go/judge

RUN go generate ./cmd/go-judge/version \
    && CGO_ENABLE=0 go build -v -tags grpcnotrace,nomsgpack -o go-judge ./cmd/go-judge 

FROM debian:latest

WORKDIR /opt

COPY --from=build /go/judge/go-judge /go/judge/mount.yaml /opt/

EXPOSE 5050/tcp 5051/tcp

ENTRYPOINT ["./go-judge"]
```

```dockerfile [alpine]
FROM golang:alpine AS build

WORKDIR /go/judge 

RUN apk update && apk add git

COPY go.mod go.sum /go/judge/

RUN go mod download -x

COPY ./ /go/judge

RUN go generate ./cmd/go-judge/version \
    && CGO_ENABLE=0 go build -v -tags grpcnotrace,nomsgpack -o go-judge ./cmd/go-judge

FROM alpine:latest

WORKDIR /opt

COPY --from=build /go/judge/go-judge /go/judge/mount.yaml /opt/

EXPOSE 5050/tcp 5051/tcp

ENTRYPOINT ["./go-judge"]
```

:::