// Dependency Injection Container
type Constructor<T = {}> = new (...args: any[]) => T;
type ServiceFactory<T> = () => T;
type ServiceIdentifier<T> = Constructor<T> | string | symbol;

interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton?: boolean;
  instance?: T;
}

export class Container {
  private services = new Map<ServiceIdentifier<any>, ServiceDefinition>();

  /**
   * Registra um serviço no container
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {},
  ): this {
    this.services.set(identifier, {
      factory,
      singleton: options.singleton ?? false,
    });
    return this;
  }

  /**
   * Registra um singleton no container
   */
  registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    factory: ServiceFactory<T>,
  ): this {
    return this.register(identifier, factory, { singleton: true });
  }

  /**
   * Registra uma instância específica
   */
  registerInstance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
    this.services.set(identifier, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  /**
   * Resolve uma dependência
   */
  resolve<T>(identifier: ServiceIdentifier<T>): T {
    const service = this.services.get(identifier);

    if (!service) {
      throw new Error(`Service ${String(identifier)} not registered`);
    }

    // Se é singleton e já tem instância, retorna ela
    if (service.singleton && service.instance) {
      return service.instance;
    }

    // Cria nova instância
    const instance = service.factory();

    // Se é singleton, armazena a instância
    if (service.singleton) {
      service.instance = instance;
    }

    return instance;
  }

  /**
   * Verifica se um serviço está registrado
   */
  has<T>(identifier: ServiceIdentifier<T>): boolean {
    return this.services.has(identifier);
  }

  /**
   * Remove um serviço do container
   */
  remove<T>(identifier: ServiceIdentifier<T>): boolean {
    return this.services.delete(identifier);
  }

  /**
   * Limpa todos os serviços
   */
  clear(): void {
    this.services.clear();
  }
}

// Container global
export const container = new Container();

// Símbolos para identificar serviços
export const TYPES = {
  // Repositories
  ClientRepository: Symbol.for("ClientRepository"),
  ProductRepository: Symbol.for("ProductRepository"),
  UserRepository: Symbol.for("UserRepository"),

  // Services
  AuthService: Symbol.for("AuthService"),
  SessionService: Symbol.for("SessionService"),

  // Use Cases
  ImportClientsUseCase: Symbol.for("ImportClientsUseCase"),
  LoginUseCase: Symbol.for("LoginUseCase"),
} as const;
