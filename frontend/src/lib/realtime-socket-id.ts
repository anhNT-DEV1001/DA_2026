// socket.id hiện tại của tab, gửi kèm request (header x-socket-id) để backend không đẩy realtime ngược lại cho chính tab này
let socketId: string | undefined;

export const getRealtimeSocketId = () => socketId;

export function setRealtimeSocketId(id: string | undefined) {
  socketId = id;
}
