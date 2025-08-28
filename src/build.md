# 编译

## 编译 docker

终端中运行 `docker build -t go-judge -f Dockerfile.exec .`

沙箱服务需要特权级别 docker 来创建子容器和提供 cgroup 资源限制。

## 编译沙箱终端

编译 `go build ./cmd/go-judge-shell`

运行 `./go-judge-shell`，需要打开 gRPC 接口来使用。提供一个沙箱内的终端环境。

## 编译 Docker 镜像

在 `go-judge` 目录下使用下面的示例创建 `Dockerfile` ，然后运行 `docker build -t go-judge .` 构建。

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