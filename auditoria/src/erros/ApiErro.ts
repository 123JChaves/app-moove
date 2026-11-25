export class ApiErro extends Error {
    constructor(mensagem: string, public readonly status: number) {
        super(mensagem);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class RequisicaoInvalidaErro extends ApiErro {
    constructor(mensagem: string) { super(mensagem, 400); }
}

export class NaoAutorizadoErro extends ApiErro {
    constructor(mensagem = "Token de autenticação ausente ou inválido.") { super(mensagem, 401); }
}

export class NaoEncontradoErro extends ApiErro {
    constructor(mensagem: string) { super(mensagem, 404); }
}
