import nodemailer from 'nodemailer';

/**
 * Service para envio de emails e notificações
 * Gerencia templates de emails e integração com provedores
 * Utiliza nodemailer para envio via SMTP
 * 
 * @class EmailService
 * @description Service responsável por comunicação via email com usuários
 */
class EmailService {
  constructor() {
    // Configuração do transporter (usando Gmail)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // seu-email@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD // senha de app do Gmail
      }
    });
  }

  /**
   * Envia email de boas-vindas para novos usuários do Google
   */
  async sendWelcomeEmail(userEmail, userName) {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: userEmail,
        subject: '🎉 Bem-vindo à OceanNotes!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🌊 OceanNotes</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Suas ideias em movimento</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">Olá, ${userName || 'Usuário'}! 👋</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                <strong>Obrigado por testar a app para o curso!</strong>
              </p>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                Você acaba de se juntar à OceanNotes usando sua conta Google. 
                Agora você pode criar, organizar e compartilhar suas notas de forma inteligente.
              </p>
            </div>

            <div style="background: white; border: 2px solid #e9ecef; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #333; margin-top: 0;">✨ O que você pode fazer:</h3>
              <ul style="color: #666; line-height: 1.8; font-size: 16px; padding-left: 20px;">
                <li><strong>📝 Criar notas</strong> - Organize suas ideias e pensamentos</li>
                <li><strong>🏷️ Usar tópicos</strong> - Categorize suas notas com cores</li>
                <li><strong>🤝 Compartilhar</strong> - Colabore com outros usuários</li>
                <li><strong>🔍 Filtrar</strong> - Encontre suas notas rapidamente</li>
                <li><strong>📊 Ver grafo</strong> - Visualize conexões entre suas notas</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                🚀 Começar a usar agora
              </a>
            </div>

            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center; color: #999; font-size: 14px;">
              <p>Este é um projeto acadêmico desenvolvido para demonstrar funcionalidades modernas de aplicações web.</p>
              <p style="margin: 5px 0;">💙 Obrigado por fazer parte desta jornada de aprendizado!</p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email de boas-vindas enviado:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Testa a configuração de email
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Conexão com Gmail estabelecida com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro na configuração de email:', error);
      return false;
    }
  }
}

export default new EmailService();
