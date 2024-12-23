import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { Socket } from 'socket.io'

@Injectable()
export class WsValidationPipe implements PipeTransform {
    /**
     * Transforms and validates incoming data
     * @param value - Value to transform and validate
     * @param metadata - Metadata about the value
     * @returns Transformed and validated value
     * @throws Error if validation fails
     */
    async transform(value: unknown, metadata: ArgumentMetadata) {
        console.log('WsValidationPipe processing:', {
            value,
            type: metadata.type,
            metatype: metadata.metatype,
        })

        if (value instanceof Socket) {
            return value
        }

        if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
            console.log('No validation needed, returning value as is')
            return value
        }

        const object = plainToInstance(metadata.metatype, value, {
            enableImplicitConversion: true,
            excludeExtraneousValues: false,
        })
        console.log('Transformed object:', object)

        const errors = await validate(object)
        if (errors.length > 0) {
            throw new Error('Validation failed: ' + JSON.stringify(errors))
        }

        return object
    }

    private toValidate(metatype: abstract new (...args: any[]) => any): boolean {
        const types: (abstract new (...args: any[]) => any)[] = [
            String,
            Boolean,
            Number,
            Array,
            Object,
        ]
        return !types.includes(metatype)
    }
}
