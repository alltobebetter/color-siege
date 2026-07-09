import type * as Party from "partykit/server";

/**
 * 匹配服务器
 * - 玩家加入 "lobby" 房间排队
 * - 凑够 2 人后分配 gameId，双方各自跳转到游戏房间
 * - 将来可扩展：机器人匹配、段位匹配等
 */

interface QueuedPlayer {
  id: string;
  name: string;
}

export default class MatchmakerServer implements Party.Server {
  queue: QueuedPlayer[] = [];

  constructor(public room: Party.Room) {}

  onConnect(_conn: Party.Connection, _ctx: Party.ConnectionContext) {
    // 等待客户端发送 queue 消息
  }

  onMessage(msg: string, sender: Party.Connection) {
    let data: any;
    try {
      data = JSON.parse(msg as string);
    } catch {
      return;
    }

    switch (data.type) {
      case "queue":
        this.handleQueue(sender, data.name);
        break;
      case "cancel":
        this.handleCancel(sender);
        break;
    }
  }

  handleQueue(sender: Party.Connection, name: string) {
    const playerName = name || "Guest";

    // 避免重复排队
    this.queue = this.queue.filter((p) => p.id !== sender.id);
    this.queue.push({ id: sender.id, name: playerName });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;

      // 生成游戏房间 ID
      const gameId = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

      // 通知双方
      for (const conn of this.room.connections.values()) {
        if (conn.id === p1.id) {
          conn.send(
            JSON.stringify({
              type: "matched",
              gameId,
              opponent: p2.name,
            })
          );
        } else if (conn.id === p2.id) {
          conn.send(
            JSON.stringify({
              type: "matched",
              gameId,
              opponent: p1.name,
            })
          );
        }
      }
    } else {
      // 排队中
      sender.send(JSON.stringify({ type: "waiting" }));
    }
  }

  handleCancel(sender: Party.Connection) {
    this.queue = this.queue.filter((p) => p.id !== sender.id);
    sender.send(JSON.stringify({ type: "cancelled" }));
  }

  onClose(conn: Party.Connection) {
    this.queue = this.queue.filter((p) => p.id !== conn.id);
  }

  onError(conn: Party.Connection, _err: Error) {
    this.queue = this.queue.filter((p) => p.id !== conn.id);
  }
}

MatchmakerServer satisfies Party.Worker;
