import { relations } from "drizzle-orm/relations";
import { users, appointments, providers, messages, patientProfiles, providerTimeBlocks, providerWeeklySchedules, packages, organizations, userBenefitVerificationAttempts, messageAttachments, organizationPackages } from "./schema";

export const appointmentsRelations = relations(appointments, ({one}) => ({
	user: one(users, {
		fields: [appointments.patientId],
		references: [users.id]
	}),
	provider: one(providers, {
		fields: [appointments.providerId],
		references: [providers.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	appointments: many(appointments),
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	patientProfiles: many(patientProfiles),
	providers: many(providers),
	package_selectedPackageId: one(packages, {
		fields: [users.selectedPackageId],
		references: [packages.id],
		relationName: "users_selectedPackageId_packages_id"
	}),
	package_selectedPackageId: one(packages, {
		fields: [users.selectedPackageId],
		references: [packages.id],
		relationName: "users_selectedPackageId_packages_id"
	}),
	organization: one(organizations, {
		fields: [users.sponsoringOrganizationId],
		references: [organizations.id]
	}),
	userBenefitVerificationAttempts: many(userBenefitVerificationAttempts),
}));

export const providersRelations = relations(providers, ({one, many}) => ({
	appointments: many(appointments),
	providerTimeBlocks: many(providerTimeBlocks),
	user: one(users, {
		fields: [providers.userId],
		references: [users.id]
	}),
	providerWeeklySchedules: many(providerWeeklySchedules),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
	messageAttachments: many(messageAttachments),
}));

export const patientProfilesRelations = relations(patientProfiles, ({one}) => ({
	user: one(users, {
		fields: [patientProfiles.userId],
		references: [users.id]
	}),
}));

export const providerTimeBlocksRelations = relations(providerTimeBlocks, ({one}) => ({
	provider: one(providers, {
		fields: [providerTimeBlocks.providerId],
		references: [providers.id]
	}),
}));

export const providerWeeklySchedulesRelations = relations(providerWeeklySchedules, ({one}) => ({
	provider: one(providers, {
		fields: [providerWeeklySchedules.providerId],
		references: [providers.id]
	}),
}));

export const packagesRelations = relations(packages, ({many}) => ({
	users_selectedPackageId: many(users, {
		relationName: "users_selectedPackageId_packages_id"
	}),
	users_selectedPackageId: many(users, {
		relationName: "users_selectedPackageId_packages_id"
	}),
	organizationPackages_packageId: many(organizationPackages, {
		relationName: "organizationPackages_packageId_packages_id"
	}),
	organizationPackages_packageId: many(organizationPackages, {
		relationName: "organizationPackages_packageId_packages_id"
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	users: many(users),
	organizationPackages: many(organizationPackages),
}));

export const userBenefitVerificationAttemptsRelations = relations(userBenefitVerificationAttempts, ({one}) => ({
	user: one(users, {
		fields: [userBenefitVerificationAttempts.userId],
		references: [users.id]
	}),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({one}) => ({
	message: one(messages, {
		fields: [messageAttachments.messageId],
		references: [messages.id]
	}),
}));

export const organizationPackagesRelations = relations(organizationPackages, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationPackages.organizationId],
		references: [organizations.id]
	}),
	package_packageId: one(packages, {
		fields: [organizationPackages.packageId],
		references: [packages.id],
		relationName: "organizationPackages_packageId_packages_id"
	}),
	package_packageId: one(packages, {
		fields: [organizationPackages.packageId],
		references: [packages.id],
		relationName: "organizationPackages_packageId_packages_id"
	}),
}));