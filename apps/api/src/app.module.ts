import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './integrations/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { MatchingModule } from './modules/matching/matching.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { BillingModule } from './modules/billing/billing.module';
import { ContentModule } from './modules/content/content.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { MailModule } from './modules/mail/mail.module';
import { QueuesModule } from './queues/queues.module';
import { CorrelationIdMiddleware } from './observability/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    IdentityModule,
    CandidatesModule,
    CompaniesModule,
    TaxonomyModule,
    JobsModule,
    ApplicationsModule,
    InterviewsModule,
    MatchingModule,
    CommunicationsModule,
    BillingModule,
    ContentModule,
    AdminModule,
    AnalyticsModule,
    FilesModule,
    MailModule,
    QueuesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
