/**
 * Validation functions for form inputs
 */

/**
 * Validate form title
 * @param {string} title - Form title to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateFormTitle(title) {
    if (!title || typeof title !== 'string') {
        return {
            success: false,
            error: 'Form title is required.'
        };
    }
    
    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length === 0) {
        return {
            success: false,
            error: 'Form title cannot be empty.'
        };
    }
    
    if (trimmedTitle.length > 100) {
        return {
            success: false,
            error: 'Form title must be 100 characters or less.'
        };
    }
    
    return {
        success: true,
        value: trimmedTitle
    };
}

/**
 * Validate form description
 * @param {string} description - Form description to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateFormDescription(description) {
    if (!description || typeof description !== 'string') {
        return {
            success: false,
            error: 'Form description is required.'
        };
    }
    
    const trimmedDescription = description.trim();
    
    if (trimmedDescription.length === 0) {
        return {
            success: false,
            error: 'Form description cannot be empty.'
        };
    }
    
    if (trimmedDescription.length > 500) {
        return {
            success: false,
            error: 'Form description must be 500 characters or less.'
        };
    }
    
    return {
        success: true,
        value: trimmedDescription
    };
}

/**
 * Validate question text
 * @param {string} questionText - Question text to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateQuestionText(questionText) {
    if (!questionText || typeof questionText !== 'string') {
        return {
            success: false,
            error: 'Question text is required.'
        };
    }
    
    const trimmedQuestion = questionText.trim();
    
    if (trimmedQuestion.length === 0) {
        return {
            success: false,
            error: 'Question text cannot be empty.'
        };
    }
    
    if (trimmedQuestion.length > 45) {
        return {
            success: false,
            error: 'Question text must be 45 characters or less (Discord modal limitation).'
        };
    }
    
    return {
        success: true,
        value: trimmedQuestion
    };
}

/**
 * Validate button label
 * @param {string} buttonLabel - Button label to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateButtonLabel(buttonLabel) {
    if (!buttonLabel || typeof buttonLabel !== 'string') {
        return {
            success: false,
            error: 'Button label is required.'
        };
    }
    
    const trimmedLabel = buttonLabel.trim();
    
    if (trimmedLabel.length === 0) {
        return {
            success: false,
            error: 'Button label cannot be empty.'
        };
    }
    
    if (trimmedLabel.length > 80) {
        return {
            success: false,
            error: 'Button label must be 80 characters or less.'
        };
    }
    
    return {
        success: true,
        value: trimmedLabel
    };
}

/**
 * Validate question count
 * @param {number} count - Number of questions
 * @returns {object} Validation result with success flag and error message
 */
export function validateQuestionCount(count) {
    if (typeof count !== 'number' || !Number.isInteger(count)) {
        return {
            success: false,
            error: 'Question count must be a valid number.'
        };
    }
    
    if (count < 1) {
        return {
            success: false,
            error: 'Form must have at least 1 question.'
        };
    }
    
    if (count > 5) {
        return {
            success: false,
            error: 'Form cannot have more than 5 questions (Discord modal limitation).'
        };
    }
    
    return {
        success: true,
        value: count
    };
}

/**
 * Validate button color
 * @param {string} color - Button color to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateButtonColor(color) {
    const validColors = ['Primary', 'Secondary', 'Success', 'Danger'];
    
    if (!color || typeof color !== 'string') {
        return {
            success: false,
            error: 'Button color is required.'
        };
    }
    
    if (!validColors.includes(color)) {
        return {
            success: false,
            error: `Button color must be one of: ${validColors.join(', ')}.`
        };
    }
    
    return {
        success: true,
        value: color
    };
}

/**
 * Validate submission limit
 * @param {string} limit - Submission limit to validate
 * @returns {object} Validation result with success flag and error message
 */
export function validateSubmissionLimit(limit) {
    const validLimits = ['once', 'unlimited'];
    
    if (!limit || typeof limit !== 'string') {
        return {
            success: false,
            error: 'Submission limit is required.'
        };
    }
    
    if (!validLimits.includes(limit)) {
        return {
            success: false,
            error: `Submission limit must be one of: ${validLimits.join(', ')}.`
        };
    }
    
    return {
        success: true,
        value: limit
    };
}

/**
 * Validate all form basic info fields at once
 * @param {object} formData - Object containing form fields
 * @returns {object} Validation result with success flag and errors object
 */
export function validateFormBasicInfo(formData) {
    const errors = {};
    let hasErrors = false;
    
    const titleValidation = validateFormTitle(formData.title);
    if (!titleValidation.success) {
        errors.title = titleValidation.error;
        hasErrors = true;
    }
    
    const descriptionValidation = validateFormDescription(formData.description);
    if (!descriptionValidation.success) {
        errors.description = descriptionValidation.error;
        hasErrors = true;
    }
    
    const buttonLabelValidation = validateButtonLabel(formData.buttonLabel);
    if (!buttonLabelValidation.success) {
        errors.buttonLabel = buttonLabelValidation.error;
        hasErrors = true;
    }
    
    const buttonColorValidation = validateButtonColor(formData.buttonColor);
    if (!buttonColorValidation.success) {
        errors.buttonColor = buttonColorValidation.error;
        hasErrors = true;
    }
    
    const submissionLimitValidation = validateSubmissionLimit(formData.submissionLimit);
    if (!submissionLimitValidation.success) {
        errors.submissionLimit = submissionLimitValidation.error;
        hasErrors = true;
    }
    
    if (hasErrors) {
        return {
            success: false,
            errors: errors
        };
    }
    
    return {
        success: true,
        values: {
            title: titleValidation.value,
            description: descriptionValidation.value,
            buttonLabel: buttonLabelValidation.value,
            buttonColor: buttonColorValidation.value,
            submissionLimit: submissionLimitValidation.value
        }
    };
}
