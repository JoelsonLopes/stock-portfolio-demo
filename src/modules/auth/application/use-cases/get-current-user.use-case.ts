import { User } from "@/shared/domain/entities/user.entity";
import { AuthRepository } from "../../domain/repositories/auth.repository";

export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(): User | null {
    return this.authRepository.getCurrentUser();
  }
}
