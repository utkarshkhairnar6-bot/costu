import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async getDashboardStats() {
    try {
      const totalCalls = await this.prisma.call.count();
      
      const averageScoreRaw = await this.prisma.call.aggregate({
        _avg: {
          overallScore: true,
        },
      });
      const averageScore = Math.round(averageScoreRaw._avg.overallScore || 0);

      const totalDuration = await this.prisma.call.aggregate({
        _sum: {
          duration: true,
        },
      });
      const practiceTimeMinutes = Math.round((totalDuration._sum.duration || 0) / 60);

      // Fatal Trends count
      const fatalErrorsCount = await this.prisma.fatalError.count();
      
      // Compliance violations categorized
      const fatalErrors = await this.prisma.fatalError.findMany();
      const complianceViolations = {
        'False Commitment': 0,
        'Wrong Interest Rate': 0,
        'Wrong Eligibility Information': 0,
        'Incomplete Disclosure': 0,
        'Compliance Miss': 0,
        'Unprofessional Language': 0,
      };

      fatalErrors.forEach(err => {
        if (complianceViolations[err.category] !== undefined) {
          complianceViolations[err.category]++;
        } else {
          complianceViolations[err.category] = (complianceViolations[err.category] || 0) + 1;
        }
      });

      // Get agents performance
      const agents = await this.prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
        include: {
          calls: {
            select: { overallScore: true },
          },
        },
      });

      const agentStats = agents.map(agent => {
        const scores = agent.calls.map(c => c.overallScore);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          callsCount: agent.calls.length,
          avgScore: avg,
        };
      });

      const topAgents = [...agentStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
      const bottomAgents = [...agentStats].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

      // Mock historical trends for chart rendering (if database has little data)
      const historicalTrends = [
        { date: 'June 20', callsCount: 3, avgScore: 55, fatalsCount: 2 },
        { date: 'June 21', callsCount: 5, avgScore: 68, fatalsCount: 1 },
        { date: 'June 22', callsCount: 8, avgScore: 72, fatalsCount: 1 },
        { date: 'June 23', callsCount: 12, avgScore: 78, fatalsCount: 0 },
        { date: 'June 24', callsCount: totalCalls || 15, avgScore: averageScore || 80, fatalsCount: fatalErrorsCount || 0 },
      ];

      return {
        success: true,
        data: {
          totalCalls,
          averageScore,
          practiceTimeMinutes,
          fatalErrorsCount,
          complianceViolations,
          topAgents,
          bottomAgents,
          historicalTrends,
          improvementRate: totalCalls > 1 ? 12 : 0, // mock WoW increase
        },
      };
    } catch (err) {
      throw new HttpException(`Failed to compile analytics dashboard: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
