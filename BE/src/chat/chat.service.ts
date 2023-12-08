import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { ChatEntity } from 'src/entities/chat.entity';
import { ChatDto } from './dto/chat.dto';
import { UserEntity } from 'src/entities/user.entity';
import { FcmHandler, PushMessage } from '../utils/fcmHandler';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'jsonwebtoken';

export interface ChatRoom {
  room_id: number;
}
interface Payload extends JwtPayload {
  userId: string;
  nickname: string;
}
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoomEntity)
    private chatRoomRepository: Repository<ChatRoomEntity>,
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private fcmHandler: FcmHandler,
    private configService: ConfigService,
  ) {}

  async saveMessage(message: ChatDto, is_read: boolean) {
    const chat = new ChatEntity();
    chat.sender = message.sender;
    chat.message = message.message;
    chat.chat_room = message.room_id;
    chat.is_read = is_read;
    chat.count = message.count;
    await this.chatRepository.save(chat);
  }

  async createRoom(
    postId: number,
    userId: string,
    writerId: string,
  ): Promise<ChatRoom> {
    const isExist = await this.chatRoomRepository.findOne({
      where: { post_id: postId, user: userId, writer: writerId },
    });
    if (isExist) {
      return { room_id: isExist.id };
    }
    const chatRoom = new ChatRoomEntity();
    chatRoom.post_id = postId;
    chatRoom.writer = writerId;
    chatRoom.user = userId;

    try {
      const roomId = (await this.chatRoomRepository.save(chatRoom)).id;
      return { room_id: roomId };
    } catch (e) {
      if (e.errno === 1452) {
        return null;
      } else {
        throw new HttpException('서버 오류', 500);
      }
    }
  }

  async findRoomList(userId: string) {
    let now = new Set();
    const rooms = await this.chatRoomRepository
      .createQueryBuilder('chat_room')
      .select([
        'chat_room.user',
        'chat_room.writer',
        'chat_room.id',
        'chat_room.post_id',
        'chat.message',
        'chat.create_date',
      ])
      .where('chat_room.user = :userId', {
        userId: userId,
      })
      .orWhere('chat_room.writer = :userId', {
        userId: userId,
      })
      .leftJoin('chat', 'chat', 'chat_room.id = chat.chat_room')
      .orderBy('chat.id', 'DESC')
      .addSelect(['user.w.user_hash', 'user.w.profile_img', 'user.w.nickname'])
      .leftJoin('user', 'user.w', 'user.w.user_hash = chat_room.writer')
      .addSelect(['user.u.user_hash', 'user.u.profile_img', 'user.u.nickname'])
      .leftJoin('user', 'user.u', 'user.u.user_hash = chat_room.user')
      .addSelect(['post.thumbnail', 'post.title'])
      .leftJoin('post', 'post', 'post.id = chat_room.post_id')
      .getRawMany();

    const result = rooms
      .reduce((acc, cur) => {
        acc.push({
          room_id: cur.chat_room_id,
          post_id: cur.chat_room_post_id,
          post_title: cur.post_title,
          post_thumbnail: cur.post_thumbnail,
          user: cur['user.w_user_hash'],
          user_profile_img: cur['user.w_profile_img'],
          user_nickname: cur['user.w_nickname'],
          writer: cur['user.u_user_hash'],
          writer_profile_img: cur['user.u_profile_img'],
          writer_nickname: cur['user.u_nickname'],
          last_chat: cur.chat_message,
          last_chat_date: cur.chat_create_date,
        });
        return acc;
      }, [])
      .sort((a, b) => {
        return b.last_chat_date - a.last_chat_date;
      })
      .reduce((acc, cur) => {
        if (!now.has(cur.room_id)) {
          acc.push(cur);
          now.add(cur.room_id);
        }
        return acc;
      }, []);

    return result;
  }

  async findRoomById(roomId: number, userId: string) {
    await this.chatRepository
      .createQueryBuilder('chat')
      .update()
      .set({ is_read: true })
      .where('chat.chat_room = :roomId', { roomId: roomId })
      .andWhere('chat.is_read = :isRead', { isRead: false })
      .andWhere('chat.sender != :userId', { userId: userId })
      .execute();

    const room = await this.chatRoomRepository.findOne({
      where: {
        id: roomId,
      },
      relations: ['chats', 'userUser', 'writerUser'],
    });

    this.checkAuth(room, userId);
    console.log(room);
    return {
      writer: room.writer,
      writer_profile_img:
        room.writerUser.profile_img === null
          ? this.configService.get('DEFAULT_PROFILE_IMAGE')
          : room.writerUser.profile_img,
      user: room.user,
      user_profile_img:
        room.userUser.profile_img === null
          ? this.configService.get('DEFAULT_PROFILE_IMAGE')
          : room.userUser.profile_img,
      post_id: room.post_id,
      chat_log: room.chats,
    };
  }

  checkAuth(room: ChatRoomEntity, userId: string) {
    if (!room) {
      throw new HttpException('존재하지 않는 채팅방입니다.', 404);
    } else if (room.writer !== userId && room.user !== userId) {
      throw new HttpException('권한이 없습니다.', 403);
    }
  }

  async sendPush(message: ChatDto) {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: message.room_id },
      relations: ['writerUser', 'userUser'],
    });
    const receiver: UserEntity =
      chatRoom.writerUser.user_hash === message.sender
        ? chatRoom.userUser
        : chatRoom.writerUser;
    const pushMessage: PushMessage = this.fcmHandler.createChatPushMessage(
      receiver.nickname,
      message.message,
      message.room_id,
    );
    await this.fcmHandler.sendPush(receiver.user_hash, pushMessage);
  }

  validateUser(authorization) {
    try {
      const payload: Payload = jwt.verify(
        authorization.split(' ')[1],
        this.configService.get('JWT_SECRET'),
      ) as Payload;
      console.log(payload.userId);
      return payload.userId;
    } catch {
      return null;
    }
  }
}
