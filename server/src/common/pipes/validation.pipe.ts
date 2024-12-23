import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { Socket } from 'socket.io'

@Injectable()
export class WsValidationPipe implements PipeTransform {
    async transform(value: any, metadata: ArgumentMetadata) {
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
            console.error('Validation errors:', errors)
            throw new Error('Validation failed: ' + JSON.stringify(errors))
        }

        console.log('Validation passed')
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
