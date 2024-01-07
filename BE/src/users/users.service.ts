import { HttpException, Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { S3Handler } from '../common/S3Handler';
import { hashMaker } from 'src/common/hashMaker';
import { RegistrationTokenEntity } from '../entities/registrationToken.entity';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { FcmHandler } from 'src/common/fcmHandler';
import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import { GreenEyeHandler } from '../common/greenEyeHandler';
import { UserRepository } from './user.repository';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    @InjectRepository(RegistrationTokenEntity)
    private registrationTokenRepository: Repository<RegistrationTokenEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    private s3Handler: S3Handler,
    private configService: ConfigService,
    private fcmHandler: FcmHandler,
    private greenEyeHandler: GreenEyeHandler,
  ) {}

  async createUser(imageLocation: string, createUserDto: CreateUserDto) {
    const userEntity = new UserEntity();
    userEntity.nickname = createUserDto.nickname;
    userEntity.social_id = createUserDto.social_email;
    userEntity.OAuth_domain = createUserDto.OAuth_domain;
    userEntity.profile_img = imageLocation;
    userEntity.user_hash = hashMaker(createUserDto.nickname).slice(0, 8);
    return await this.userRepository.getRepository(UserEntity).save(userEntity);
  }

  async findUserById(userId: string) {
    const user: UserEntity = await this.userRepository
      .getRepository(UserEntity)
      .findOne({
        where: { user_hash: userId },
      });
    if (user) {
      if (user.profile_img === null) {
        user.profile_img = this.configService.get('DEFAULT_PROFILE_IMAGE');
      }
      return { nickname: user.nickname, profile_img: user.profile_img };
    } else {
      return null;
    }
  }

  async removeUser(id: string, userId: string, accessToken: string) {
    await this.checkAuth(id, userId);
    const decodedToken: any = jwt.decode(accessToken);
    if (decodedToken && decodedToken.exp) {
      await this.fcmHandler.removeRegistrationToken(decodedToken.userId);
      const ttl: number = decodedToken.exp - Math.floor(Date.now() / 1000);
      await this.cacheManager.set(accessToken, 'logout', { ttl });
    }
    await this.userRepository.softDeleteCascade(userId);
    return true;
  }

  async checkAuth(id, userId) {
    const isDataExists = await this.userRepository
      .getRepository(UserEntity)
      .findOne({
        where: { user_hash: id },
      });
    if (!isDataExists) {
      throw new HttpException('유저가 존재하지 않습니다.', 404);
    }
    if (id !== userId) {
      throw new HttpException('수정 권한이 없습니다.', 403);
    }
  }

  async updateUserById(
    id: string,
    nickname: string,
    imageLocation: string,
    userId: string,
  ) {
    await this.checkAuth(id, userId);
    const user = new UserEntity();
    user.nickname = nickname ?? undefined;
    user.profile_img = imageLocation ?? undefined;

    await this.userRepository
      .getRepository(UserEntity)
      .update({ user_hash: userId }, user);
  }

  async registerToken(userId, registrationToken) {
    const registrationTokenEntity =
      await this.registrationTokenRepository.findOne({
        where: { user_hash: userId },
      });
    if (registrationTokenEntity === null) {
      await this.registrationTokenRepository.save({
        user_hash: userId,
        registration_token: registrationToken,
      });
    } else {
      await this.updateRegistrationToken(userId, registrationToken);
    }
  }

  async updateRegistrationToken(userId, registrationToken) {
    const registrationTokenEntity = new RegistrationTokenEntity();
    registrationTokenEntity.registration_token = registrationToken;
    await this.registrationTokenRepository.update(
      {
        user_hash: userId,
      },
      registrationTokenEntity,
    );
  }
}
