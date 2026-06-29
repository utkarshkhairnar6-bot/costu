import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('personas')
export class PersonaController {
  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultPersonas().catch(err => {
      console.error(`Persona seeding failed: ${err.message}`);
    });
  }

  private async seedDefaultPersonas() {
    // Seed default admin and agent users first
    const usersCount = await this.prisma.user.count();
    let defaultUser;
    if (usersCount === 0) {
      defaultUser = await this.prisma.user.create({
        data: {
          id: 'test-agent-id-123',
          email: 'agent@voicely.com',
          password: 'hashed-password-here', // simple mockup hash
          name: 'Utkarsh Khairnar',
          role: 'EMPLOYEE'
        }
      });
      console.log('Seeded default agent user: agent@voicely.com');
    } else {
      defaultUser = await this.prisma.user.findFirst();
    }

    const personasCount = await this.prisma.persona.count();
    if (personasCount === 0) {
      await this.prisma.persona.createMany({
        data: [
          {
            id: 'suresh',
            name: 'Jignesh Rathod',
            details: 'Loan Range: ₹10L | Pending app | Price Sensitive',
            language: 'Hindi',
            behavior: 'Price Sensitive & Inquisitive',
            systemPrompt: `You are Jignesh Rathod, a price-sensitive Hindi/Hinglish speaking customer. You prefer speaking in Hindi. You object to interest rates compared to other options. Tone: Skeptical but polite.`
          },
          {
            id: 'ramesh',
            name: 'Ramesh Kumar',
            details: 'Loan Range: ₹5L | Busy & Impatient | Strict',
            language: 'Hinglish',
            behavior: 'Impatient & Busy',
            systemPrompt: `You are Ramesh Kumar, a busy corporate customer who has no time. You speak Hinglish. Tone: Abrupt, hurried, and direct.`
          },
          {
            id: 'priya',
            name: 'Priya Sharma',
            details: 'Loan Range: ₹15L | Polite & Detail-oriented',
            language: 'English',
            behavior: 'Polite & Detail-oriented',
            systemPrompt: `You are Priya Sharma, a polite customer who prefers English. You ask detailed questions about the onboarding digital journey. Tone: Pleasant and curious.`
          }
        ]
      });
      console.log('Seeded default simulator personas (Jignesh, Ramesh, Priya)');
    }
  }

  @Get()
  async getPersonas() {
    try {
      return await this.prisma.persona.findMany();
    } catch (err) {
      throw new HttpException(`Failed to fetch customer personas: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createPersona(
    @Body() body: {
      name: string;
      details: string;
      language: string;
      behavior: string;
      systemPrompt: string;
    }
  ) {
    const { name, details, language, behavior, systemPrompt } = body;
    if (!name || !language || !systemPrompt) {
      throw new HttpException('Missing name, language, or system prompt.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.prisma.persona.create({
        data: {
          name,
          details: details || '',
          language,
          behavior: behavior || 'Neutral',
          systemPrompt
        }
      });
    } catch (err) {
      throw new HttpException(`Failed to create persona: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
